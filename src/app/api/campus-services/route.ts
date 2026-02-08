import { NextRequest } from 'next/server'
import { CampusServiceStatus } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'

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

    const services = await prisma.campusService.findMany({
      where: {
        ...(universityId ? { universityId } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        university: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: [{ name: 'asc' }],
    })

    return successResponse(services)
  } catch (error) {
    return handleApiError(error)
  }
}
