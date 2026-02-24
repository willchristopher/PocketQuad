import { NextRequest } from 'next/server'

import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'
import { getFacultyCached } from '@/lib/server/universityData'

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

    const faculty = await getFacultyCached(
      universityId,
      department ?? undefined,
      search ?? undefined,
      profile.id,
    )

    return successResponse(faculty)
  } catch (error) {
    return handleApiError(error)
  }
}
