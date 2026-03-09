import { prisma } from '@/lib/prisma'
import { facultyBuildingManagerSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser({
      includeManagedBuildings: true,
    })

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required')
    }

    if (!profile.universityId) {
      return successResponse({
        availableBuildings: [],
        managedBuildings: [],
      })
    }

    const now = new Date()
    const managedIds = new Set(
      (profile.managedBuildings ?? []).map((assignment) => assignment.buildingId),
    )

    const buildings = await prisma.campusBuilding.findMany({
      where: {
        universityId: profile.universityId,
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
      orderBy: { name: 'asc' },
    })

    const buildingIds = buildings.map((building) => building.id)

    const [announcements, events] = buildingIds.length
      ? await Promise.all([
          prisma.announcement.findMany({
            where: {
              universityId: profile.universityId,
              scope: 'BUILDING',
              buildingId: { in: buildingIds },
              isActive: true,
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: now } },
              ],
            },
            select: {
              id: true,
              buildingId: true,
              title: true,
              message: true,
              createdAt: true,
              expiresAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 60,
          }),
          prisma.event.findMany({
            where: {
              universityId: profile.universityId,
              buildingId: { in: buildingIds },
              isPublished: true,
              isCancelled: false,
              date: { gte: now },
            },
            select: {
              id: true,
              buildingId: true,
              title: true,
              date: true,
              time: true,
              category: true,
            },
            orderBy: { date: 'asc' },
            take: 60,
          }),
        ])
      : [[], []]

    const announcementsByBuilding = new Map<string, typeof announcements>()
    for (const item of announcements) {
      if (!item.buildingId) continue
      const current = announcementsByBuilding.get(item.buildingId) ?? []
      if (current.length < 3) {
        current.push(item)
        announcementsByBuilding.set(item.buildingId, current)
      }
    }

    const eventsByBuilding = new Map<string, typeof events>()
    for (const item of events) {
      if (!item.buildingId) continue
      const current = eventsByBuilding.get(item.buildingId) ?? []
      if (current.length < 3) {
        current.push(item)
        eventsByBuilding.set(item.buildingId, current)
      }
    }

    const allBuildings = buildings.map((building) => ({
      ...building,
      isManaged: managedIds.has(building.id),
      announcements: announcementsByBuilding.get(building.id) ?? [],
      upcomingEvents: eventsByBuilding.get(building.id) ?? [],
    }))

    return successResponse({
      availableBuildings: allBuildings,
      managedBuildings: allBuildings.filter((building) => building.isManaged),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await getAuthenticatedUser({
      includeManagedBuildings: true,
    })

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required')
    }

    if (!profile.universityId) {
      throw new ApiError(400, 'University association required')
    }

    const payload = facultyBuildingManagerSchema.parse(await request.json())

    const building = await prisma.campusBuilding.findFirst({
      where: {
        id: payload.buildingId,
        universityId: profile.universityId,
      },
      select: {
        id: true,
        name: true,
        type: true,
      },
    })

    if (!building) {
      throw new ApiError(404, 'Building not found')
    }

    await prisma.buildingManagerAssignment.upsert({
      where: {
        userId_buildingId: {
          userId: profile.id,
          buildingId: building.id,
        },
      },
      update: {},
      create: {
        userId: profile.id,
        buildingId: building.id,
      },
    })

    return successResponse({
      building,
      managed: true,
    }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
