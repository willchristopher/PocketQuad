import { prisma } from '@/lib/prisma'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  resolveParams,
  successResponse,
} from '@/lib/api/utils'

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { profile } = await getAuthenticatedUser()
    const { id } = await resolveParams(context)

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

    const existingPreferences = await prisma.notificationPreferences.findUnique({
      where: { userId: profile.id },
      select: {
        buildingIds: true,
      },
    })

    const currentBuildingIds = existingPreferences?.buildingIds ?? []
    const isFavorited = !currentBuildingIds.includes(id)
    const buildingIds = isFavorited
      ? [id, ...currentBuildingIds.filter((buildingId) => buildingId !== id)]
      : currentBuildingIds.filter((buildingId) => buildingId !== id)

    await prisma.notificationPreferences.upsert({
      where: { userId: profile.id },
      update: {
        buildingIds,
      },
      create: {
        userId: profile.id,
        buildingIds,
      },
    })

    return successResponse({
      buildingId: id,
      buildingIds,
      isFavorited,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
