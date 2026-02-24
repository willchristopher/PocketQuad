import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { hasPortalPermission } from '@/lib/auth/portalPermissions'
import {
  ApiError,
  getAuthenticatedAdmin,
  getAuthenticatedPortalUser,
  handleApiError,
  requireAnyPortalPermission,
  successResponse,
} from '@/lib/api/utils'
import { invalidateUniversityData, UNIVERSITY_DATA_TAGS } from '@/lib/server/universityData'
import { clubCreateSchema } from '@/lib/validations/admin'

export async function GET(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedPortalUser()
    requireAnyPortalPermission(profile, [
      'ADMIN_TAB_CLUBS',
      'CAN_MANAGE_CLUB_PROFILE',
      'CAN_MANAGE_CLUB_CONTACT',
    ])

    const universityId = request.nextUrl.searchParams.get('universityId') ?? undefined
    const canManageAllClubs = hasPortalPermission(profile, 'ADMIN_TAB_CLUBS')
    const managedClubIds = profile.managedClubs?.map((assignment) => assignment.clubId) ?? []

    if (!canManageAllClubs && managedClubIds.length === 0) {
      return successResponse([])
    }

    const records = await prisma.clubOrganization.findMany({
      where: {
        ...(canManageAllClubs
          ? universityId
            ? { universityId }
            : {}
          : { id: { in: managedClubIds } }),
      },
      include: {
        university: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: [{ university: { name: 'asc' } }, { name: 'asc' }],
    })

    return successResponse(records)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedAdmin('ADMIN_TAB_CLUBS')
    const payload = clubCreateSchema.parse(await request.json())

    const university = await prisma.university.findUnique({
      where: { id: payload.universityId },
      select: { id: true },
    })

    if (!university) {
      throw new ApiError(404, 'University not found')
    }

    const record = await prisma.clubOrganization.create({
      data: payload,
      include: {
        university: {
          select: { id: true, name: true, slug: true },
        },
      },
    })
    invalidateUniversityData(UNIVERSITY_DATA_TAGS.clubs)

    return successResponse(record, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
