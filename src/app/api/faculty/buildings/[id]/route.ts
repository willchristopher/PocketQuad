import { hasPortalPermission } from '@/lib/auth/portalPermissions'
import { canManageBuilding } from '@/lib/facultyPermissions'
import { prisma } from '@/lib/prisma'
import {
  invalidateUniversityData,
  UNIVERSITY_DATA_TAGS,
} from '@/lib/server/universityData'
import { updateManagedBuildingSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { profile } = await getAuthenticatedUser({
      includeManagedBuildings: true,
    })

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required')
    }

    const { id } = await context.params
    const payload = updateManagedBuildingSchema.parse(await request.json())

    if (!canManageBuilding(profile, id)) {
      throw new ApiError(403, 'You do not manage that building')
    }

    const building = await prisma.campusBuilding.findFirst({
      where: {
        id,
        ...(profile.universityId ? { universityId: profile.universityId } : {}),
      },
      select: {
        id: true,
      },
    })

    if (!building) {
      throw new ApiError(404, 'Building not found')
    }

    const updated = await prisma.campusBuilding.update({
      where: { id },
      data: {
        operatingHours: payload.operatingHours?.trim() || null,
        operationalStatus: payload.operationalStatus,
        operationalNote: payload.operationalNote?.trim() || null,
        accessibilityNotes: payload.accessibilityNotes?.trim() || null,
        operationalUpdatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
        operatingHours: true,
        operationalStatus: true,
        operationalNote: true,
        operationalUpdatedAt: true,
        accessibilityNotes: true,
      },
    })

    invalidateUniversityData(UNIVERSITY_DATA_TAGS.buildings)

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { profile } = await getAuthenticatedUser({
      includeManagedBuildings: true,
    })

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required')
    }

    const { id } = await context.params
    const canAdministerBuildings = hasPortalPermission(profile, 'ADMIN_TAB_BUILDINGS')

    if (
      !canAdministerBuildings &&
      !(profile.managedBuildings ?? []).some((assignment) => assignment.buildingId === id)
    ) {
      throw new ApiError(403, 'You do not manage that building')
    }

    await prisma.buildingManagerAssignment.deleteMany({
      where: {
        userId: profile.id,
        buildingId: id,
      },
    })

    return successResponse({
      buildingId: id,
      managed: false,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
