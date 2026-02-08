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

const editMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
})

function withinEditableWindow(createdAt: Date) {
  const fiveMinutes = 1000 * 60 * 5
  return Date.now() - createdAt.getTime() <= fiveMinutes
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }>  },
) {
  try {
    const { profile } = await getAuthenticatedUser()
    const { id } = await resolveParams(context)
    const payload = editMessageSchema.parse(await request.json())

    const message = await prisma.chatMessage.findUnique({
      where: { id },
      select: { id: true, userId: true, createdAt: true, isDeleted: true },
    })

    if (!message) {
      throw new ApiError(404, 'Message not found')
    }

    if (message.userId !== profile.id) {
      throw new ApiError(403, 'You can only edit your own messages')
    }

    if (message.isDeleted) {
      throw new ApiError(400, 'Deleted messages cannot be edited')
    }

    if (!withinEditableWindow(message.createdAt)) {
      throw new ApiError(403, 'Edit window has expired')
    }

    const updated = await prisma.chatMessage.update({
      where: { id },
      data: {
        content: payload.content,
        isEdited: true,
      },
    })

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }>  },
) {
  try {
    const { profile } = await getAuthenticatedUser()
    const { id } = await resolveParams(context)

    const message = await prisma.chatMessage.findUnique({
      where: { id },
      select: { id: true, userId: true, createdAt: true, isDeleted: true },
    })

    if (!message) {
      throw new ApiError(404, 'Message not found')
    }

    if (message.userId !== profile.id) {
      throw new ApiError(403, 'You can only delete your own messages')
    }

    if (!withinEditableWindow(message.createdAt)) {
      throw new ApiError(403, 'Delete window has expired')
    }

    if (message.isDeleted) {
      return successResponse({ success: true })
    }

    await prisma.chatMessage.update({
      where: { id },
      data: {
        isDeleted: true,
        content: '[deleted]',
      },
    })

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
