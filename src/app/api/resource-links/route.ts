import { NextRequest } from 'next/server'
import { ResourceLinkCategory } from '@prisma/client'

import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'
import { getResourceLinksCached } from '@/lib/server/universityData'

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

    const links = await getResourceLinksCached(universityId, categoryFilter, query)

    return successResponse(links)
  } catch (error) {
    return handleApiError(error)
  }
}
