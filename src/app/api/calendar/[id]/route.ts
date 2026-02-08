import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createCalendarEventSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  resolveParams,
  successResponse,
} from '@/lib/api/utils'

const updateCalendarEventSchema = createCalendarEventSchema.partial()

async function getOwnedCalendarEvent(id: string, userId: string) {
  const item = await prisma.calendarEvent.findUnique({
    where: { id },
  })

  if (!item) {
    throw new ApiError(404, 'Calendar event not found')
  }

  if (item.userId !== userId) {
    throw new ApiError(403, 'You can only manage your own calendar events')
  }

  return item
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }>  },
) {
  try {
    const { profile } = await getAuthenticatedUser()
    const { id } = await resolveParams(context)
    const payload = updateCalendarEventSchema.parse(await request.json())

    await getOwnedCalendarEvent(id, profile.id)

    if (payload.start && payload.end && payload.end < payload.start) {
      throw new ApiError(400, 'Event end must be after start')
    }

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: payload,
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

    await getOwnedCalendarEvent(id, profile.id)

    await prisma.calendarEvent.delete({
      where: { id },
    })

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
