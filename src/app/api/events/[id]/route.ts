import { prisma } from '@/lib/prisma'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  resolveParams,
  successResponse,
} from '@/lib/api/utils'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }>  },
) {
  try {
    const { profile } = await getAuthenticatedUser()
    const { id } = await resolveParams(context)

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: { select: { interests: true } },
        interests: {
          where: { userId: profile.id },
          select: { id: true },
        },
      },
    })

    if (!event) {
      throw new ApiError(404, 'Event not found')
    }

    return successResponse({
      ...event,
      interestedCount: event._count.interests,
      isInterested: event.interests.length > 0,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
