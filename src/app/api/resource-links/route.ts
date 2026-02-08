import { NextRequest } from 'next/server'
import { ResourceLinkCategory } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'

export async function GET(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const query = request.nextUrl.searchParams.get('search')?.trim()
    const category = request.nextUrl.searchParams.get('category') ?? undefined
    const categoryFilter =
      category && Object.values(ResourceLinkCategory).includes(category as ResourceLinkCategory)
        ? (category as ResourceLinkCategory)
        : undefined
    const requestedUniversityId = request.nextUrl.searchParams.get('universityId') ?? undefined
    const universityId =
      profile.role === 'ADMIN' && requestedUniversityId
        ? requestedUniversityId
        : profile.universityId ?? undefined

    const links = await prisma.campusResourceLink.findMany({
      where: {
        ...(universityId ? { universityId } : {}),
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(query
          ? {
              OR: [
                { label: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        university: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: [{ category: 'asc' }, { label: 'asc' }],
    })

    return successResponse(links)
  } catch (error) {
    return handleApiError(error)
  }
}
