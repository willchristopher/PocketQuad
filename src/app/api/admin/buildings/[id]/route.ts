import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils'
import { invalidateUniversityData, UNIVERSITY_DATA_TAGS } from '@/lib/server/universityData'
import { campusBuildingUpdateSchema } from '@/lib/validations/admin'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await getAuthenticatedAdmin('ADMIN_TAB_BUILDINGS')
    const { id } = await context.params
    const payload = campusBuildingUpdateSchema.parse(await request.json())

    if (payload.universityId) {
      const university = await prisma.university.findUnique({
        where: { id: payload.universityId },
        select: { id: true },
      })

      if (!university) {
        throw new ApiError(404, 'University not found')
      }
    }

    const updated = await prisma.campusBuilding.update({
      where: { id },
      data: payload,
      include: {
        university: {
          select: { id: true, name: true, slug: true },
        },
      },
    })
    invalidateUniversityData(UNIVERSITY_DATA_TAGS.buildings)

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await getAuthenticatedAdmin('ADMIN_TAB_BUILDINGS')
    const { id } = await context.params

    await prisma.campusBuilding.delete({ where: { id } })
    invalidateUniversityData(UNIVERSITY_DATA_TAGS.buildings)

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
