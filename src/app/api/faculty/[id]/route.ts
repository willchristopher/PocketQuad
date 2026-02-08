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

    const faculty = await prisma.faculty.findUnique({
      where: { id },
      include: {
        officeHourSlots: {
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
        favorites: {
          where: {
            userId: profile.id,
          },
          select: {
            id: true,
          },
        },
      },
    })

    if (!faculty) {
      throw new ApiError(404, 'Faculty member not found')
    }

    return successResponse({
      ...faculty,
      isFavorited: faculty.favorites.length > 0,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
