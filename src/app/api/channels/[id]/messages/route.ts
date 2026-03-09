import { NextRequest } from 'next/server'

import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit'
import { prisma } from '@/lib/prisma'
import { moderateCampusChatMessage, scanChannelMessagesForModeration } from '@/lib/chat/moderation'
import { sendMessageSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  parseNumber,
  resolveParams,
  successResponse,
} from '@/lib/api/utils'

async function assertMembership(channelId: string, userId: string) {
  const membership = await prisma.channelMember.findUnique({
    where: {
      channelId_userId: {
        channelId,
        userId,
      },
    },
  })

  if (!membership) {
    throw new ApiError(403, 'You are not a member of this channel')
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }>  },
) {
  try {
    const { profile } = await getAuthenticatedUser()
    const { id } = await resolveParams(context)

    await assertMembership(id, profile.id)
    await scanChannelMessagesForModeration(id)

    const cursor = request.nextUrl.searchParams.get('cursor')
    const limit = Math.min(100, Math.max(1, parseNumber(request.nextUrl.searchParams.get('limit'), 30)))

    const messages = await prisma.chatMessage.findMany({
      where: {
        channelId: id,
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          },
        },
        reactions: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = messages.length > limit
    const slice = hasMore ? messages.slice(0, limit) : messages

    return successResponse({
      items: slice.reverse(),
      nextCursor: hasMore ? slice[slice.length - 1]?.id : null,
      hasMore,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }>  },
) {
  try {
    const { profile } = await getAuthenticatedUser()
    const rateLimit = assertRateLimit({
      key: 'channels:messages:create',
      limit: 40,
      windowMs: 60_000,
      request,
      identifier: profile.id,
      message: 'Too many messages sent too quickly. Please slow down and try again.',
    })
    const { id } = await resolveParams(context)

    await assertMembership(id, profile.id)

    const payload = sendMessageSchema.parse(await request.json())
    const moderation = await moderateCampusChatMessage(payload.content)

    if (!moderation.allowed) {
      throw new ApiError(400, moderation.reason)
    }

    if (payload.replyToId) {
      const replyTarget = await prisma.chatMessage.findUnique({
        where: { id: payload.replyToId },
        select: { id: true, channelId: true },
      })

      if (!replyTarget || replyTarget.channelId !== id) {
        throw new ApiError(400, 'Invalid reply target')
      }
    }

    const message = await prisma.chatMessage.create({
      data: {
        channelId: id,
        userId: profile.id,
        content: payload.content,
        replyToId: payload.replyToId,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          },
        },
        reactions: true,
      },
    })

    return withRateLimitHeaders(successResponse(message, 201), rateLimit)
  } catch (error) {
    return handleApiError(error)
  }
}
