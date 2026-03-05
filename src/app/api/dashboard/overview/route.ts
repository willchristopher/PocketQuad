import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'
import {
  getClubsCached,
  getCampusServicesCached,
  getResourceLinksCached,
} from '@/lib/server/universityData'

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser()

    const universityId = profile.universityId ?? undefined
    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId: profile.id },
      select: {
        buildingIds: true,
        clubInterestIds: true,
      },
    })
    const pinnedBuildingIds = preferences?.buildingIds ?? []
    const pinnedClubIds = preferences?.clubInterestIds ?? []

    const [
      upcomingEvents,
      upcomingDeadlines,
      serviceSnapshot,
      quickLinks,
      clubSnapshot,
      favoriteFaculty,
      campusNews,
      pinnedBuildings,
      pinnedClubs,
    ] = await Promise.all([
        prisma.event.findMany({
          where: {
            ...(universityId ? { universityId } : {}),
            date: { gte: new Date() },
            isPublished: true,
            isCancelled: false,
          },
          select: {
            id: true,
            title: true,
            date: true,
            time: true,
            location: true,
          },
          orderBy: { date: 'asc' },
          take: 4,
        }),
        prisma.deadline.findMany({
          where: {
            userId: profile.id,
            dueDate: { gte: new Date() },
          },
          select: {
            id: true,
            title: true,
            course: true,
            priority: true,
            dueDate: true,
          },
          orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }],
          take: 3,
        }),
        getCampusServicesCached(universityId, undefined).then((records) => records.slice(0, 3)),
        getResourceLinksCached(universityId, undefined, undefined).then((records) => records.slice(0, 4)),
        pinnedClubIds.length > 0
          ? prisma.clubOrganization.findMany({
              where: {
                id: { in: pinnedClubIds },
                ...(universityId ? { universityId } : {}),
              },
              select: {
                id: true,
                name: true,
                category: true,
              },
            }).then((records) => {
              const byId = new Map(records.map((record) => [record.id, record]))
              return pinnedClubIds.map((id) => byId.get(id)).filter(Boolean).slice(0, 3)
            })
          : getClubsCached(universityId, undefined, undefined).then((records) => records.slice(0, 3)),
        prisma.facultyFavorite.findMany({
          where: { userId: profile.id },
          select: {
            faculty: {
              select: {
                id: true,
                name: true,
                department: true,
                officeHours: true,
                officeLocation: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }).then((rows) => rows.map((r) => r.faculty)),
        prisma.announcement.findMany({
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            message: true,
            linkUrl: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 4,
        }),
        pinnedBuildingIds.length > 0
          ? prisma.campusBuilding.findMany({
              where: {
                id: { in: pinnedBuildingIds },
                ...(universityId ? { universityId } : {}),
              },
              select: {
                id: true,
                name: true,
                type: true,
                address: true,
                operationalStatus: true,
              },
            }).then((records) => {
              const byId = new Map(records.map((record) => [record.id, record]))
              return pinnedBuildingIds.map((id) => byId.get(id)).filter(Boolean)
            })
          : Promise.resolve([]),
        pinnedClubIds.length > 0
          ? prisma.clubOrganization.findMany({
              where: {
                id: { in: pinnedClubIds },
                ...(universityId ? { universityId } : {}),
              },
              select: {
                id: true,
                name: true,
                category: true,
              },
            }).then((records) => {
              const byId = new Map(records.map((record) => [record.id, record]))
              return pinnedClubIds.map((id) => byId.get(id)).filter(Boolean)
            })
          : Promise.resolve([]),
      ])

    return successResponse({
      upcomingEvents,
      upcomingDeadlines,
      serviceSnapshot,
      quickLinks,
      clubSnapshot,
      favoriteFaculty,
      campusNews,
      pinnedBuildings,
      pinnedClubs,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
