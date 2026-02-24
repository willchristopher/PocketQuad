import { NextRequest } from 'next/server'
import { CampusServiceStatus } from '@prisma/client'

import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'
import { getCampusServicesCached } from '@/lib/server/universityData'

export async function GET(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const status = request.nextUrl.searchParams.get('status') ?? undefined
    const statusFilter =
      status && Object.values(CampusServiceStatus).includes(status as CampusServiceStatus)
        ? (status as CampusServiceStatus)
        : undefined
    const requestedUniversityId = request.nextUrl.searchParams.get('universityId') ?? undefined
    const universityId =
      profile.role === 'ADMIN' && requestedUniversityId
        ? requestedUniversityId
        : profile.universityId ?? undefined

    const services = await getCampusServicesCached(universityId, statusFilter)

    return successResponse(services)
  } catch (error) {
    return handleApiError(error)
  }
}
