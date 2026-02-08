import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { joinQueueSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  resolveParams,
  successResponse,
} from '@/lib/api/utils'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }>  },
) {
  try {
    const { profile } = await getAuthenticatedUser()
    const { id } = await resolveParams(context)

    const officeHour = await prisma.officeHour.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!officeHour) {
      throw new ApiError(404, 'Office hour not found')
    }

    const queue = await prisma.officeHourQueue.findMany({
      where: { officeHourId: id },
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
      orderBy: [{ position: 'asc' }, { joinedAt: 'asc' }],
    })

    if (profile.role === 'FACULTY' || profile.role === 'ADMIN' || officeHour.userId === profile.id) {
      return successResponse(queue)
    }

    return successResponse(queue.filter((entry: any) => entry.studentId === profile.id))
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

    if (profile.role !== 'STUDENT') {
      throw new ApiError(403, 'Only students can join a queue')
    }

    const { id } = await resolveParams(context)
    const payload = joinQueueSchema.parse(await request.json())

    const officeHour = await prisma.officeHour.findUnique({
      where: { id },
      include: {
        queue: {
          where: {
            status: {
              in: ['WAITING', 'IN_PROGRESS'],
            },
          },
          orderBy: { position: 'desc' },
          take: 1,
        },
      },
    })

    if (!officeHour) {
      throw new ApiError(404, 'Office hour not found')
    }

    if (!officeHour.isActive) {
      throw new ApiError(400, 'Office hour queue is not active')
    }

    const activeCount = await prisma.officeHourQueue.count({
      where: {
        officeHourId: id,
        status: {
          in: ['WAITING', 'IN_PROGRESS'],
        },
      },
    })

    if (activeCount >= officeHour.maxQueue) {
      throw new ApiError(409, 'Queue is full')
    }

    const existing = await prisma.officeHourQueue.findFirst({
      where: {
        officeHourId: id,
        studentId: profile.id,
        status: {
          in: ['WAITING', 'IN_PROGRESS'],
        },
      },
      select: { id: true },
    })

    if (existing) {
      throw new ApiError(409, 'You are already in this queue')
    }

    const nextPosition = (officeHour.queue[0]?.position ?? 0) + 1

    const entry = await prisma.officeHourQueue.create({
      data: {
        officeHourId: id,
        studentId: profile.id,
        topic: payload.topic,
        position: nextPosition,
      },
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

    return successResponse(entry, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
