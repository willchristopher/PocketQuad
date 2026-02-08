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

const queueStatusSchema = z.object({
  status: z.enum(['WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }>  },
) {
  try {
    const { profile } = await getAuthenticatedUser()
    const { id } = await resolveParams(context)
    const payload = queueStatusSchema.parse(await request.json())

    const entry = await prisma.officeHourQueue.findUnique({
      where: { id },
      include: {
        officeHour: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!entry) {
      throw new ApiError(404, 'Queue entry not found')
    }

    const isFacultyOwner = entry.officeHour.userId === profile.id
    const isQueueStudent = entry.studentId === profile.id

    if (!isFacultyOwner && !isQueueStudent) {
      throw new ApiError(403, 'Not authorized to update this queue entry')
    }

    if (isQueueStudent && payload.status !== 'CANCELLED') {
      throw new ApiError(403, 'Students can only cancel their own queue entry')
    }

    if (isFacultyOwner && !['IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(payload.status)) {
      throw new ApiError(400, 'Invalid faculty status transition')
    }

    const updateData: {
      status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
      startedAt?: Date | null
      completedAt?: Date | null
    } = {
      status: payload.status,
    }

    if (payload.status === 'IN_PROGRESS') {
      updateData.startedAt = new Date()
    }

    if (payload.status === 'COMPLETED' || payload.status === 'NO_SHOW' || payload.status === 'CANCELLED') {
      updateData.completedAt = new Date()
    }

    const updated = await prisma.officeHourQueue.update({
      where: { id },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
            email: true,
          },
        },
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

    const entry = await prisma.officeHourQueue.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        status: true,
      },
    })

    if (!entry) {
      throw new ApiError(404, 'Queue entry not found')
    }

    if (entry.studentId !== profile.id) {
      throw new ApiError(403, 'Only the queued student can leave the queue')
    }

    if (entry.status !== 'WAITING') {
      throw new ApiError(400, 'Only WAITING entries can be removed')
    }

    await prisma.officeHourQueue.delete({
      where: { id },
    })

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
