import { NextRequest } from 'next/server'

import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit'
import { prisma } from '@/lib/prisma'
import { reviewReportedMessage } from '@/lib/chat/moderation'
import { reportMessageSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  resolveParams,
  successResponse,
} from '@/lib/api/utils'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { profile } = await getAuthenticatedUser()
    const rateLimit = assertRateLimit({
      key: 'messages:report',
      limit: 20,
      windowMs: 60 * 60_000,
      request,
      identifier: profile.id,
      message: 'Too many report submissions. Please wait before reporting more messages.',
    })
    const { id } = await resolveParams(context)
    const payload = reportMessageSchema.parse(await request.json())

    const message = await prisma.chatMessage.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        channelId: true,
        isDeleted: true,
      },
    })

    if (!message) {
      throw new ApiError(404, 'Message not found')
    }

    if (message.userId === profile.id) {
      throw new ApiError(400, 'You cannot report your own message')
    }

    const membership = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId: message.channelId,
          userId: profile.id,
        },
      },
      select: { id: true },
    })

    if (!membership) {
      throw new ApiError(403, 'You are not a member of this channel')
    }

    if (message.isDeleted) {
      throw new ApiError(400, 'This message has already been removed')
    }

    try {
      await prisma.chatMessageReport.create({
        data: {
          messageId: message.id,
          reporterId: profile.id,
          reason: payload.reason,
        },
      })
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        throw new ApiError(409, 'You have already reported this message')
      }
      throw error
    }

    const review = await reviewReportedMessage(message.id)

    return withRateLimitHeaders(
      successResponse({
        reported: true,
        removed: review.removed,
        reportCount: review.reportCount,
      }),
      rateLimit,
    )
  } catch (error) {
    return handleApiError(error)
  }
}
