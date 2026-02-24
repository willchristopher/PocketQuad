import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils'
import { invalidateUniversityData, UNIVERSITY_DATA_TAGS } from '@/lib/server/universityData'
import { campusBuildingCreateSchema } from '@/lib/validations/admin'

export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedAdmin('ADMIN_TAB_BUILDINGS')
    const universityId = request.nextUrl.searchParams.get('universityId') ?? undefined

    const records = await prisma.campusBuilding.findMany({
      where: {
        ...(universityId ? { universityId } : {}),
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
    await getAuthenticatedAdmin('ADMIN_TAB_BUILDINGS')
    const payload = campusBuildingCreateSchema.parse(await request.json())

    const university = await prisma.university.findUnique({
      where: { id: payload.universityId },
      select: { id: true },
    })

    if (!university) {
      throw new ApiError(404, 'University not found')
    }

    const record = await prisma.campusBuilding.create({
      data: payload,
      include: {
        university: {
          select: { id: true, name: true, slug: true },
        },
      },
    })
    invalidateUniversityData(UNIVERSITY_DATA_TAGS.buildings)

    return successResponse(record, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
