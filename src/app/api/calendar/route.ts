import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createCalendarEventSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'

export async function GET(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()

    const start = request.nextUrl.searchParams.get('start')
    const end = request.nextUrl.searchParams.get('end')

    if (!start || !end) {
      throw new ApiError(400, 'start and end query params are required')
    }

    const startDate = new Date(start)
    const endDate = new Date(end)

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new ApiError(400, 'Invalid start or end date')
    }

    const items = await prisma.calendarEvent.findMany({
      where: {
        userId: profile.id,
        start: {
          gte: startDate,
        },
        end: {
          lte: endDate,
        },
      },
      orderBy: {
        start: 'asc',
      },
    })

    return successResponse(items)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const payload = createCalendarEventSchema.parse(await request.json())

    if (payload.end < payload.start) {
      throw new ApiError(400, 'Event end must be after start')
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId: profile.id,
        title: payload.title,
        description: payload.description,
        start: payload.start,
        end: payload.end,
        allDay: payload.allDay,
        type: payload.type,
        location: payload.location,
      },
    })

    return successResponse(event, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
