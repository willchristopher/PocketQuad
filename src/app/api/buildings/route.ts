import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'

export async function GET(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const query = request.nextUrl.searchParams.get('search')?.trim()
    const requestedUniversityId = request.nextUrl.searchParams.get('universityId') ?? undefined
    const universityId =
      profile.role === 'ADMIN' && requestedUniversityId
        ? requestedUniversityId
        : profile.universityId ?? undefined

    const buildings = await prisma.campusBuilding.findMany({
      where: {
        ...(universityId ? { universityId } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { address: { contains: query, mode: 'insensitive' } },
                { type: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        university: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: [{ name: 'asc' }],
    })

    return successResponse(buildings)
  } catch (error) {
    return handleApiError(error)
  }
}
