import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'

export async function GET(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const department = request.nextUrl.searchParams.get('department') ?? undefined
    const search = request.nextUrl.searchParams.get('search') ?? undefined
    const requestedUniversityId = request.nextUrl.searchParams.get('universityId') ?? undefined
    const universityId =
      profile.role === 'ADMIN' && requestedUniversityId
        ? requestedUniversityId
        : profile.universityId ?? undefined

    const faculty = await prisma.faculty.findMany({
      where: {
        ...(universityId ? { universityId } : {}),
        ...(department ? { department } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { title: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        favorites: {
          where: {
            userId: profile.id,
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: [{ department: 'asc' }, { name: 'asc' }],
    })

    return successResponse(
      faculty.map((item) => ({
        ...item,
        isFavorited: item.favorites.length > 0,
      })),
    )
  } catch (error) {
    return handleApiError(error)
  }
}
