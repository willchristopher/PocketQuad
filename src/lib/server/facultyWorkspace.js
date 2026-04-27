import { prisma } from '@/lib/prisma';
import { hasPortalPermission } from '@/lib/auth/portalPermissions';
import { canPublishCampusAnnouncements } from '@/lib/facultyPermissions';
import { composeFacultyOfficeHoursSummary, formatFacultyAvailability, parseLegacyFacultyAvailability } from '@/lib/faculty';
import { listCampusBuildingsCompatible } from '@/lib/server/campusBuildings';
import { getAnnouncementAudienceLabel, listUniversityAnnouncements, getActiveAnnouncementWhere } from '@/lib/server/announcements';
import { getFacultyEventOwner } from '@/lib/server/facultyEvents';
import { isMissingDatabaseFieldError } from '@/lib/server/dbCompatibility';
import { ApiError } from '@/lib/api/utils';

async function resolveManagedBuildingAssignments(profile) {
  if (Array.isArray(profile.managedBuildings)) {
    return profile.managedBuildings;
  }

  return prisma.buildingManagerAssignment.findMany({
    where: { userId: profile.id },
    select: {
      buildingId: true,
      building: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });
}

export async function getFacultyStatusData(userId) {
  try {
    const faculty = await prisma.faculty.findUnique({
      where: { userId },
      select: {
        id: true,
        availabilityStatus: true,
        availabilityNote: true,
      },
    });

    if (!faculty) {
      throw new ApiError(403, 'Faculty profile is required for this action');
    }

    return {
      status: faculty.availabilityStatus,
      note: faculty.availabilityNote ?? '',
      display: formatFacultyAvailability(faculty.availabilityStatus, faculty.availabilityNote),
    };
  } catch (error) {
    if (!isMissingDatabaseFieldError(error)) {
      throw error;
    }

    const faculty = await prisma.faculty.findUnique({
      where: { userId },
      select: {
        id: true,
        officeHours: true,
      },
    });

    if (!faculty) {
      throw new ApiError(403, 'Faculty profile is required for this action');
    }

    const parsed = parseLegacyFacultyAvailability(faculty.officeHours);

    return {
      status: parsed.status,
      note: parsed.note ?? '',
      display: formatFacultyAvailability(parsed.status, parsed.note),
    };
  }
}

export async function getFacultyOfficeHoursData(userId) {
  const faculty = await prisma.faculty.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!faculty) {
    throw new ApiError(403, 'Faculty profile is required for this action');
  }

  return prisma.officeHour.findMany({
    where: {
      facultyId: faculty.id,
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
}

export async function getFacultyEventsData(profile) {
  await getFacultyEventOwner(profile.id);

  return prisma.event.findMany({
    where: {
      organizerId: profile.id,
    },
    select: {
      id: true,
      universityId: true,
      buildingId: true,
      title: true,
      description: true,
      imageUrl: true,
      date: true,
      endDate: true,
      time: true,
      location: true,
      category: true,
      organizer: true,
      organizerId: true,
      maxAttendees: true,
      isPublished: true,
      isCancelled: true,
      createdAt: true,
      updatedAt: true,
      building: {
        select: {
          id: true,
          name: true,
          address: true,
          type: true,
        },
      },
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });
}

export async function getFacultyWorkspaceData(profile) {
  const faculty = await prisma.faculty.findUnique({
    where: { userId: profile.id },
    select: {
      id: true,
      userId: true,
      universityId: true,
      name: true,
      title: true,
      department: true,
      email: true,
      phone: true,
      officeLocation: true,
      officeHours: true,
      bio: true,
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
  });

  if (!faculty) {
    throw new ApiError(403, 'Faculty profile is required for this action');
  }

  const canManageBuildings = hasPortalPermission(profile, 'ADMIN_TAB_BUILDINGS');
  const canManageServices = hasPortalPermission(profile, 'ADMIN_TAB_SERVICES');
  const universityId = faculty.universityId ?? profile.universityId;
  const managedBuildings = await resolveManagedBuildingAssignments(profile);
  const managedBuildingIds = managedBuildings.map((assignment) => assignment.buildingId);
  const [availableBuildings, availableServices] = await Promise.all([
    universityId
      ? prisma.campusBuilding.findMany({
          where: canManageBuildings
            ? { universityId }
            : {
                universityId,
                id: {
                  in: managedBuildingIds.length > 0 ? managedBuildingIds : ['__none__'],
                },
              },
          select: {
            id: true,
            name: true,
            type: true,
          },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
    universityId && canManageServices
      ? prisma.campusService.findMany({
          where: { universityId },
          select: {
            id: true,
            name: true,
            location: true,
          },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
  ]);

  const fallbackAvailability = parseLegacyFacultyAvailability(faculty.officeHours);
  const status = faculty.availabilityStatus ?? fallbackAvailability.status;
  const note = faculty.availabilityNote ?? fallbackAvailability.note ?? null;

  return {
    ...faculty,
    canPublishCampusAnnouncements: canPublishCampusAnnouncements(profile),
    canManageBuildings,
    canManageServices,
    managedBuildings,
    availableBuildings,
    availableServices,
    studentAvailabilityLabel: formatFacultyAvailability(status, note),
    studentAvailabilityState: status,
    officeHoursDisplay: composeFacultyOfficeHoursSummary(status, note, faculty.officeHourSlots),
  };
}

export async function getFacultyAnnouncementsData(profile) {
  const canPublishCampus = canPublishCampusAnnouncements(profile);
  const canManageBuildings = hasPortalPermission(profile, 'ADMIN_TAB_BUILDINGS');
  const canManageServices = hasPortalPermission(profile, 'ADMIN_TAB_SERVICES');
  const managedBuildings = await resolveManagedBuildingAssignments(profile);
  const managedBuildingIds = managedBuildings.map((assignment) => assignment.buildingId);
  const universityId = profile.universityId ?? undefined;

  let schemaSupportsScopedAnnouncements = true;
  try {
    await prisma.announcement.findFirst({
      select: {
        scope: true,
      },
    });
  } catch (error) {
    if (!isMissingDatabaseFieldError(error)) {
      throw error;
    }
    schemaSupportsScopedAnnouncements = false;
  }

  const [availableBuildings, availableServices, items] = await Promise.all([
    universityId && schemaSupportsScopedAnnouncements
      ? prisma.campusBuilding.findMany({
          where: canManageBuildings
            ? { universityId }
            : {
                universityId,
                id: {
                  in: managedBuildingIds.length > 0 ? managedBuildingIds : ['__none__'],
                },
              },
          select: {
            id: true,
            name: true,
            type: true,
          },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
    universityId && canManageServices && schemaSupportsScopedAnnouncements
      ? prisma.campusService.findMany({
          where: { universityId },
          select: {
            id: true,
            name: true,
            location: true,
          },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
    listUniversityAnnouncements(universityId, 12),
  ]);

  return {
    canPublish: canPublishCampus,
    permissions: {
      canPublishCampus,
      canPublishBuildings:
        schemaSupportsScopedAnnouncements && (canManageBuildings || managedBuildingIds.length > 0),
      canPublishServices: schemaSupportsScopedAnnouncements && canManageServices,
    },
    availableBuildings,
    availableServices,
    items,
    schemaSupportsScopedAnnouncements,
  };
}

export async function getFacultyBuildingsData(profile) {
  if (!profile.universityId) {
    return {
      availableBuildings: [],
      managedBuildings: [],
    };
  }

  const now = new Date();
  const managedBuildings = await resolveManagedBuildingAssignments(profile);
  const managedIds = new Set(managedBuildings.map((assignment) => assignment.buildingId));
  const buildings = await listCampusBuildingsCompatible({
    where: {
      universityId: profile.universityId,
    },
    orderBy: { name: 'asc' },
  });
  const buildingIds = buildings.map((building) => building.id);

  const [announcements, events] = buildingIds.length
    ? await Promise.all([
        prisma.announcement.findMany({
          where: {
            universityId: profile.universityId,
            scope: 'BUILDING',
            buildingId: { in: buildingIds },
            ...getActiveAnnouncementWhere(now),
          },
          select: {
            id: true,
            buildingId: true,
            title: true,
            message: true,
            linkUrl: true,
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
            description: true,
            date: true,
            time: true,
            location: true,
            category: true,
            maxAttendees: true,
          },
          orderBy: { date: 'asc' },
          take: 60,
        }),
      ])
    : [[], []];

  const announcementsByBuilding = new Map();
  for (const item of announcements) {
    if (!item.buildingId) continue;
    const current = announcementsByBuilding.get(item.buildingId) ?? [];
    if (current.length < 3) {
      current.push(item);
      announcementsByBuilding.set(item.buildingId, current);
    }
  }

  const eventsByBuilding = new Map();
  for (const item of events) {
    if (!item.buildingId) continue;
    const current = eventsByBuilding.get(item.buildingId) ?? [];
    if (current.length < 3) {
      current.push(item);
      eventsByBuilding.set(item.buildingId, current);
    }
  }

  const allBuildings = buildings.map((building) => ({
    ...building,
    isManaged: managedIds.has(building.id),
    announcements: announcementsByBuilding.get(building.id) ?? [],
    upcomingEvents: eventsByBuilding.get(building.id) ?? [],
  }));

  return {
    availableBuildings: allBuildings,
    managedBuildings: allBuildings.filter((building) => building.isManaged),
  };
}
