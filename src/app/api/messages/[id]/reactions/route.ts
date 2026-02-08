import { NextRequest } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  resolveParams,
  successResponse,
} from '@/lib/api/utils'

const reactionSchema = z.object({
  emoji: z.string().trim().min(1).max(16),
})

async function ensureMessageMembership(messageId: string, userId: string) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: {
      channel: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!message) {
    throw new ApiError(404, 'Message not found')
  }

  const membership = await prisma.channelMember.findUnique({
    where: {
      channelId_userId: {
        channelId: message.channelId,
        userId,
      },
    },
  })

  if (!membership) {
    throw new ApiError(403, 'You are not a member of this channel')
  }

  return message
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }>  },
) {
  try {
    const { profile } = await getAuthenticatedUser()
    const { id } = await resolveParams(context)
    const payload = reactionSchema.parse(await request.json())

    await ensureMessageMembership(id, profile.id)

    const reaction = await prisma.messageReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId: id,
          userId: profile.id,
          emoji: payload.emoji,
        },
      },
      update: {},
      create: {
        messageId: id,
        userId: profile.id,
        emoji: payload.emoji,
      },
    })

    return successResponse(reaction, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }>  },
) {
  try {
    const { profile } = await getAuthenticatedUser()
    const { id } = await resolveParams(context)
    const payload = reactionSchema.parse(await request.json())

    await ensureMessageMembership(id, profile.id)

    await prisma.messageReaction.deleteMany({
      where: {
        messageId: id,
        userId: profile.id,
        emoji: payload.emoji,
      },
    })

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
