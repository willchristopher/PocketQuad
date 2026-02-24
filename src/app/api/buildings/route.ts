import { NextRequest } from 'next/server'

import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'
import { getBuildingsCached } from '@/lib/server/universityData'

export async function GET(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const query = request.nextUrl.searchParams.get('search')?.trim()
    const requestedUniversityId = request.nextUrl.searchParams.get('universityId') ?? undefined
    const universityId =
      profile.role === 'ADMIN' && requestedUniversityId
        ? requestedUniversityId
        : profile.universityId ?? undefined

    const buildings = await getBuildingsCached(universityId, query)

    return successResponse(buildings)
  } catch (error) {
    return handleApiError(error)
  }
}
