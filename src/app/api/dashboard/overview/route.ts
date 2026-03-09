import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'
import {
  getStudentFacingFacultyAvailability,
  parseLegacyFacultyAvailability,
  summarizeFacultyOfficeHours,
} from '@/lib/faculty'
import { listUniversityAnnouncements } from '@/lib/server/announcements'
import { isMissingDatabaseFieldError } from '@/lib/server/dbCompatibility'
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

    const favoriteFacultyPromise = prisma.facultyFavorite.findMany({
      where: { userId: profile.id },
      select: {
        faculty: {
          select: {
            id: true,
            name: true,
            title: true,
            department: true,
            officeHours: true,
            officeLocation: true,
            tags: true,
            availabilityStatus: true,
            availabilityNote: true,
            officeHourSlots: {
              select: {
                dayOfWeek: true,
                startTime: true,
                endTime: true,
              },
              orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }).then((rows) => rows.map((row) => {
      const studentAvailability = getStudentFacingFacultyAvailability(
        row.faculty.availabilityStatus,
        row.faculty.availabilityNote,
        row.faculty.officeHourSlots,
      )

      return {
        ...row.faculty,
        officeHours: summarizeFacultyOfficeHours(row.faculty.officeHourSlots),
        studentAvailabilityLabel: studentAvailability.label,
        studentAvailabilityState: studentAvailability.state,
      }
    })).catch(async (error) => {
      if (!isMissingDatabaseFieldError(error)) {
        throw error
      }

      const rows = await prisma.facultyFavorite.findMany({
        where: { userId: profile.id },
        select: {
          faculty: {
            select: {
              id: true,
              name: true,
              title: true,
              department: true,
              officeHours: true,
              officeLocation: true,
              tags: true,
              officeHourSlots: {
                select: {
                  dayOfWeek: true,
                  startTime: true,
                  endTime: true,
                },
                orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })

      return rows.map((row) => {
        const availability = parseLegacyFacultyAvailability(row.faculty.officeHours)
        const studentAvailability = getStudentFacingFacultyAvailability(
          availability.status,
          availability.note,
          row.faculty.officeHourSlots,
        )

        return {
          ...row.faculty,
          officeHours: summarizeFacultyOfficeHours(row.faculty.officeHourSlots),
          availabilityStatus: availability.status,
          availabilityNote: availability.note || null,
          studentAvailabilityLabel: studentAvailability.label,
          studentAvailabilityState: studentAvailability.state,
        }
      })
    })

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
        favoriteFacultyPromise,
        listUniversityAnnouncements(universityId, 4),
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
