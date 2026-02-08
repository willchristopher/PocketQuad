import { prisma } from '@/lib/prisma'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  resolveParams,
  successResponse,
} from '@/lib/api/utils'

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }>  },
) {
  try {
    const { profile } = await getAuthenticatedUser()
    const { id } = await resolveParams(context)

    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!event) {
      throw new ApiError(404, 'Event not found')
    }

    const existing = await prisma.eventInterest.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId: profile.id,
        },
      },
      select: { id: true },
    })

    let isInterested = false

    if (existing) {
      await prisma.eventInterest.delete({
        where: {
          eventId_userId: {
            eventId: id,
            userId: profile.id,
          },
        },
      })
      isInterested = false
    } else {
      await prisma.eventInterest.create({
        data: {
          eventId: id,
          userId: profile.id,
        },
      })
      isInterested = true
    }

    const interestedCount = await prisma.eventInterest.count({
      where: { eventId: id },
    })

    return successResponse({ interestedCount, isInterested })
  } catch (error) {
    return handleApiError(error)
  }
}
