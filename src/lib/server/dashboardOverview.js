import { prisma } from '@/lib/prisma';
import { getCurrentBuildingAvailability } from '@/lib/buildingHours';
import { getStudentFacingFacultyAvailability, parseLegacyFacultyAvailability, summarizeFacultyOfficeHours, } from '@/lib/faculty';
import { getActiveAnnouncementWhere, listUniversityAnnouncements } from '@/lib/server/announcements';
import { listCampusBuildingsCompatible } from '@/lib/server/campusBuildings';
import { isMissingDatabaseFieldError, isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import { getClubsCached, getCampusServicesCached, getResourceLinksCached } from '@/lib/server/universityData';

export async function getDashboardOverview(profile) {
  const universityId = profile.universityId ?? undefined;
  const now = new Date();

  let preferences;
  try {
    preferences = await prisma.notificationPreferences.findUnique({
      where: { userId: profile.id },
      select: {
        buildingIds: true,
        resourceLinkIds: true,
        clubInterestIds: true,
      },
    });
  } catch (error) {
    if (!isPrismaSchemaCompatibilityError(error)) {
      throw error;
    }

    preferences = await prisma.notificationPreferences.findUnique({
      where: { userId: profile.id },
      select: {
        buildingIds: true,
        clubInterestIds: true,
      },
    });
  }

  const pinnedBuildingIds = preferences?.buildingIds ?? [];
  const pinnedResourceLinkIds = preferences?.resourceLinkIds ?? [];
  const pinnedClubIds = preferences?.clubInterestIds ?? [];

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
  }).then((rows) =>
    rows.map((row) => {
      const studentAvailability = getStudentFacingFacultyAvailability(
        row.faculty.availabilityStatus,
        row.faculty.availabilityNote,
        row.faculty.officeHourSlots,
      );

      return {
        ...row.faculty,
        officeHours: summarizeFacultyOfficeHours(row.faculty.officeHourSlots),
        studentAvailabilityLabel: studentAvailability.label,
        studentAvailabilityState: studentAvailability.state,
      };
    }),
  ).catch(async (error) => {
    if (!isMissingDatabaseFieldError(error)) {
      throw error;
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
    });

    return rows.map((row) => {
      const availability = parseLegacyFacultyAvailability(row.faculty.officeHours);
      const studentAvailability = getStudentFacingFacultyAvailability(
        availability.status,
        availability.note,
        row.faculty.officeHourSlots,
      );

      return {
        ...row.faculty,
        officeHours: summarizeFacultyOfficeHours(row.faculty.officeHourSlots),
        availabilityStatus: availability.status,
        availabilityNote: availability.note || null,
        studentAvailabilityLabel: studentAvailability.label,
        studentAvailabilityState: studentAvailability.state,
      };
    });
  });

  const campusDeadlineEventsPromise = prisma.event.findMany({
    where: {
      ...(universityId ? { universityId } : {}),
      date: { gte: now },
      audience: 'DEADLINE',
      isPublished: true,
      isCancelled: false,
    },
    select: {
      id: true,
      title: true,
      date: true,
      organizer: true,
      location: true,
    },
    orderBy: { date: 'asc' },
    take: 6,
  }).catch((error) => {
    if (!isPrismaSchemaCompatibilityError(error)) {
      throw error;
    }
    return [];
  });

  const [
    upcomingEvents,
    personalDeadlines,
    campusDeadlineEvents,
    serviceSnapshot,
    quickLinks,
    clubSnapshot,
    favoriteFaculty,
    campusNews,
    pinnedBuildings,
    pinnedResourceLinks,
    pinnedClubs,
  ] = await Promise.all([
    prisma.event.findMany({
      where: {
        ...(universityId ? { universityId } : {}),
        date: { gte: now },
        isPublished: true,
        isCancelled: false,
        calendarEntries: {
          some: {
            userId: profile.id,
          },
        },
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
        dueDate: { gte: now },
      },
      select: {
        id: true,
        title: true,
        course: true,
        priority: true,
        dueDate: true,
      },
      orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }],
      take: 6,
    }),
    campusDeadlineEventsPromise,
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
          const byId = new Map(records.map((record) => [record.id, record]));
          return pinnedClubIds.map((id) => byId.get(id)).filter(Boolean).slice(0, 3);
        })
      : getClubsCached(universityId, undefined, undefined).then((records) => records.slice(0, 3)),
    favoriteFacultyPromise,
    listUniversityAnnouncements(universityId, 4),
    pinnedBuildingIds.length > 0
      ? Promise.all([
          listCampusBuildingsCompatible({
            where: {
              id: { in: pinnedBuildingIds },
              ...(universityId ? { universityId } : {}),
            },
          }),
          prisma.announcement.findMany({
            where: {
              ...(universityId ? { universityId } : {}),
              scope: 'BUILDING',
              buildingId: { in: pinnedBuildingIds },
              ...getActiveAnnouncementWhere(now),
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
          }),
        ]).then(([records, announcements]) => {
          const latestAnnouncementByBuildingId = new Map();
          for (const announcement of announcements) {
            if (announcement.buildingId && !latestAnnouncementByBuildingId.has(announcement.buildingId)) {
              latestAnnouncementByBuildingId.set(announcement.buildingId, announcement);
            }
          }
          const byId = new Map(records.map((record) => [record.id, record]));
          return pinnedBuildingIds.flatMap((id) => {
            const record = byId.get(id);
            if (!record) {
              return [];
            }

            const hours = getCurrentBuildingAvailability(record, now);
            return [{
              ...record,
              ...hours,
              operationalStatus: hours.currentOperationalStatus,
              latestAnnouncement: latestAnnouncementByBuildingId.get(record.id) ?? null,
            }];
          });
        })
      : Promise.resolve([]),
    pinnedResourceLinkIds.length > 0
      ? prisma.campusResourceLink.findMany({
          where: {
            id: { in: pinnedResourceLinkIds },
            ...(universityId ? { universityId } : {}),
          },
          select: {
            id: true,
            label: true,
            category: true,
            href: true,
          },
        }).then((records) => {
          const byId = new Map(records.map((record) => [record.id, record]));
          return pinnedResourceLinkIds.map((id) => byId.get(id)).filter(Boolean);
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
          const byId = new Map(records.map((record) => [record.id, record]));
          return pinnedClubIds.map((id) => byId.get(id)).filter(Boolean);
        })
      : Promise.resolve([]),
  ]);

  const upcomingDeadlines = [
    ...personalDeadlines.map((deadline) => ({
      id: deadline.id,
      title: deadline.title,
      course: deadline.course,
      priority: deadline.priority,
      dueDate: deadline.dueDate,
    })),
    ...campusDeadlineEvents.map((event) => ({
      id: event.id,
      title: event.title,
      course: event.organizer || event.location || 'Campus deadline',
      priority: 'MEDIUM',
      dueDate: event.date,
    })),
  ]
    .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())
    .slice(0, 3);

  return {
    upcomingEvents,
    upcomingDeadlines,
    serviceSnapshot,
    quickLinks,
    clubSnapshot,
    favoriteFaculty,
    campusNews,
    pinnedBuildings,
    pinnedResourceLinks,
    pinnedClubs,
  };
}
