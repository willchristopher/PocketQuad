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

    const faculty = await prisma.faculty.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!faculty) {
      throw new ApiError(404, 'Faculty member not found')
    }

    const existing = await prisma.facultyFavorite.findUnique({
      where: {
        facultyId_userId: {
          facultyId: id,
          userId: profile.id,
        },
      },
      select: { id: true },
    })

    let isFavorited = false

    if (existing) {
      await prisma.facultyFavorite.delete({
        where: {
          facultyId_userId: {
            facultyId: id,
            userId: profile.id,
          },
        },
      })
      isFavorited = false
    } else {
      await prisma.facultyFavorite.create({
        data: {
          facultyId: id,
          userId: profile.id,
        },
      })
      isFavorited = true
    }

    return successResponse({ isFavorited })
  } catch (error) {
    return handleApiError(error)
  }
}
