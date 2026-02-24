import { NextRequest } from 'next/server'

import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'
import { getClubsCached } from '@/lib/server/universityData'

export async function GET(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const query = request.nextUrl.searchParams.get('search')?.trim()
    const category = request.nextUrl.searchParams.get('category')?.trim()
    const requestedUniversityId = request.nextUrl.searchParams.get('universityId') ?? undefined
    const universityId =
      profile.role === 'ADMIN' && requestedUniversityId
        ? requestedUniversityId
        : profile.universityId ?? undefined

    const clubs = await getClubsCached(universityId, category ?? undefined, query)

    return successResponse(clubs)
  } catch (error) {
    return handleApiError(error)
  }
}
