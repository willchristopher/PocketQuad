import {
  CalendarEventType,
  CampusServiceStatus,
  EventAudience,
  EventCategory,
  NotificationType,
  OfficeHourMode,
  PrismaClient,
  ResourceLinkCategory,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

if (process.env.E2E_TESTING !== 'true' || process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed E2E fixtures unless E2E_TESTING=true outside production.');
  process.exit(1);
}

const universityId = 'e2e-university';
const studentId = 'e2e-student-user';
const facultyUserId = 'e2e-faculty-user';
const adminUserId = 'e2e-admin-user';
const facultyId = 'e2e-faculty-profile';
const buildingId = 'e2e-building-library';
const eventId = 'e2e-event-welcome';
const clubId = 'e2e-club-outdoor';
const resourceLinkId = 'e2e-resource-canvas';

async function upsertUser({ id, email, displayName, firstName, lastName, role, supabaseId, data = {} }) {
  return prisma.user.upsert({
    where: { email },
    update: {
      displayName,
      firstName,
      lastName,
      role,
      supabaseId,
      universityId,
      emailVerified: true,
      onboardingComplete: true,
      ...data,
    },
    create: {
      id,
      email,
      displayName,
      firstName,
      lastName,
      role,
      supabaseId,
      universityId,
      emailVerified: true,
      onboardingComplete: true,
      ...data,
    },
  });
}

async function main() {
  await prisma.university.upsert({
    where: { id: universityId },
    update: {
      name: 'PocketQuad E2E University',
      slug: 'pocketquad-e2e-university',
      domain: 'pocketquad.test',
      disabledStudentPages: [],
      themeMainColor: '#00084d',
      themeAccentColor: '#ffc317',
    },
    create: {
      id: universityId,
      name: 'PocketQuad E2E University',
      slug: 'pocketquad-e2e-university',
      domain: 'pocketquad.test',
      disabledStudentPages: [],
      themeMainColor: '#00084d',
      themeAccentColor: '#ffc317',
    },
  });

  const [student, facultyUser, adminUser] = await Promise.all([
    upsertUser({
      id: studentId,
      email: 'e2e.student@pocketquad.test',
      displayName: 'E2E Student',
      firstName: 'E2E',
      lastName: 'Student',
      role: UserRole.STUDENT,
      supabaseId: 'e2e-student-supabase-id',
      data: {
        major: 'Computer Science',
        year: 'Junior',
      },
    }),
    upsertUser({
      id: facultyUserId,
      email: 'e2e.faculty@pocketquad.test',
      displayName: 'Dr. E2E Faculty',
      firstName: 'E2E',
      lastName: 'Faculty',
      role: UserRole.FACULTY,
      supabaseId: 'e2e-faculty-supabase-id',
      data: {
        department: 'Computer Science',
        canPublishCampusAnnouncements: true,
        portalPermissions: ['CAN_PUBLISH_ANNOUNCEMENTS', 'CAN_CREATE_DEADLINE_EVENTS'],
      },
    }),
    upsertUser({
      id: adminUserId,
      email: 'e2e.admin@pocketquad.test',
      displayName: 'E2E Admin',
      firstName: 'E2E',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      supabaseId: 'e2e-admin-supabase-id',
      data: {
        adminAccessLevel: 'OWNER',
        portalPermissions: [
          'ADMIN_PORTAL_ACCESS',
          'ADMIN_TAB_OVERVIEW',
          'ADMIN_TAB_UNIVERSITIES',
          'ADMIN_TAB_STUDENT_PAGES',
          'ADMIN_TAB_FACULTY',
          'ADMIN_TAB_BUILDINGS',
          'ADMIN_TAB_LINKS',
          'ADMIN_TAB_SERVICES',
          'ADMIN_TAB_CLUBS',
          'ADMIN_TAB_EVENTS',
          'ADMIN_TAB_IT_ACCOUNTS',
          'ADMIN_TAB_USERS',
        ],
      },
    }),
  ]);

  await prisma.campusBuilding.upsert({
    where: { id: buildingId },
    update: {
      universityId,
      name: 'E2E Library',
      code: 'E2ELIB',
      type: 'Resource',
      address: '100 Test Walk',
      mapQuery: 'E2E Library PocketQuad E2E University',
      operatingHours: 'Mon-Fri 8 AM - 8 PM',
      operationalStatus: CampusServiceStatus.OPEN,
    },
    create: {
      id: buildingId,
      universityId,
      name: 'E2E Library',
      code: 'E2ELIB',
      type: 'Resource',
      address: '100 Test Walk',
      mapQuery: 'E2E Library PocketQuad E2E University',
      operatingHours: 'Mon-Fri 8 AM - 8 PM',
      operationalStatus: CampusServiceStatus.OPEN,
    },
  });

  await prisma.campusService.upsert({
    where: { id: 'e2e-service-library' },
    update: {
      universityId,
      name: 'E2E Library Desk',
      status: CampusServiceStatus.OPEN,
      hours: '8 AM - 8 PM',
      location: 'E2E Library',
      directionsUrl: 'https://maps.example.test/e2e-library',
    },
    create: {
      id: 'e2e-service-library',
      universityId,
      name: 'E2E Library Desk',
      status: CampusServiceStatus.OPEN,
      hours: '8 AM - 8 PM',
      location: 'E2E Library',
      directionsUrl: 'https://maps.example.test/e2e-library',
    },
  });

  await prisma.campusResourceLink.upsert({
    where: { id: resourceLinkId },
    update: {
      universityId,
      label: 'E2E Canvas',
      category: ResourceLinkCategory.LEARNING,
      href: 'https://canvas.example.test',
      description: 'E2E course workspace.',
    },
    create: {
      id: resourceLinkId,
      universityId,
      label: 'E2E Canvas',
      category: ResourceLinkCategory.LEARNING,
      href: 'https://canvas.example.test',
      description: 'E2E course workspace.',
    },
  });

  await prisma.clubOrganization.upsert({
    where: { id: clubId },
    update: {
      universityId,
      name: 'E2E Outdoor Club',
      category: 'Campus Life',
      description: 'Deterministic club used by E2E smoke tests.',
      contactEmail: 'outdoor@pocketquad.test',
      advisorName: 'Dr. E2E Faculty',
      advisorEmail: facultyUser.email,
      meetingInfo: 'Thursdays at 5 PM',
    },
    create: {
      id: clubId,
      universityId,
      name: 'E2E Outdoor Club',
      category: 'Campus Life',
      description: 'Deterministic club used by E2E smoke tests.',
      contactEmail: 'outdoor@pocketquad.test',
      advisorName: 'Dr. E2E Faculty',
      advisorEmail: facultyUser.email,
      meetingInfo: 'Thursdays at 5 PM',
    },
  });

  const faculty = await prisma.faculty.upsert({
    where: { userId: facultyUser.id },
    update: {
      universityId,
      name: 'Dr. E2E Faculty',
      title: 'Associate Professor',
      department: 'Computer Science',
      email: facultyUser.email,
      officeLocation: 'E2E Library 204',
      officeHours: 'Tue/Thu 2:00 PM - 4:00 PM',
      courses: ['E2E 101'],
      tags: ['testing', 'advising'],
      bio: 'Faculty fixture for E2E smoke tests.',
    },
    create: {
      id: facultyId,
      userId: facultyUser.id,
      universityId,
      name: 'Dr. E2E Faculty',
      title: 'Associate Professor',
      department: 'Computer Science',
      email: facultyUser.email,
      officeLocation: 'E2E Library 204',
      officeHours: 'Tue/Thu 2:00 PM - 4:00 PM',
      courses: ['E2E 101'],
      tags: ['testing', 'advising'],
      bio: 'Faculty fixture for E2E smoke tests.',
    },
  });

  await prisma.officeHour.upsert({
    where: { id: 'e2e-office-hour' },
    update: {
      facultyId: faculty.id,
      userId: facultyUser.id,
      dayOfWeek: 2,
      startTime: '14:00',
      endTime: '16:00',
      location: 'E2E Library 204',
      mode: OfficeHourMode.IN_PERSON,
      isActive: true,
    },
    create: {
      id: 'e2e-office-hour',
      facultyId: faculty.id,
      userId: facultyUser.id,
      dayOfWeek: 2,
      startTime: '14:00',
      endTime: '16:00',
      location: 'E2E Library 204',
      mode: OfficeHourMode.IN_PERSON,
      isActive: true,
    },
  });

  const eventDate = new Date();
  eventDate.setUTCDate(eventDate.getUTCDate() + 10);

  const event = await prisma.event.upsert({
    where: { id: eventId },
    update: {
      universityId,
      buildingId,
      title: 'E2E Welcome Night',
      description: 'A deterministic event for smoke testing.',
      date: eventDate,
      time: '6:00 PM',
      location: 'E2E Library',
      category: EventCategory.SOCIAL,
      audience: EventAudience.ALL_CAMPUS,
      organizer: 'E2E Student Life',
      organizerId: facultyUser.id,
      isPublished: true,
      isCancelled: false,
    },
    create: {
      id: eventId,
      universityId,
      buildingId,
      title: 'E2E Welcome Night',
      description: 'A deterministic event for smoke testing.',
      date: eventDate,
      time: '6:00 PM',
      location: 'E2E Library',
      category: EventCategory.SOCIAL,
      audience: EventAudience.ALL_CAMPUS,
      organizer: 'E2E Student Life',
      organizerId: facultyUser.id,
      isPublished: true,
      isCancelled: false,
    },
  });

  const deadlineDate = new Date();
  deadlineDate.setUTCDate(deadlineDate.getUTCDate() + 7);

  await Promise.all([
    prisma.eventInterest.upsert({
      where: {
        eventId_userId: {
          eventId: event.id,
          userId: student.id,
        },
      },
      update: {},
      create: {
        eventId: event.id,
        userId: student.id,
      },
    }),
    prisma.calendarEvent.upsert({
      where: { id: 'e2e-calendar-event' },
      update: {
        userId: student.id,
        campusEventId: event.id,
        title: event.title,
        start: eventDate,
        end: new Date(eventDate.getTime() + 60 * 60 * 1000),
        type: CalendarEventType.CAMPUS,
        location: event.location,
      },
      create: {
        id: 'e2e-calendar-event',
        userId: student.id,
        campusEventId: event.id,
        title: event.title,
        start: eventDate,
        end: new Date(eventDate.getTime() + 60 * 60 * 1000),
        type: CalendarEventType.CAMPUS,
        location: event.location,
      },
    }),
    prisma.deadline.upsert({
      where: { id: 'e2e-deadline' },
      update: {
        userId: student.id,
        title: 'E2E Project Checkpoint',
        course: 'E2E 101',
        dueDate: deadlineDate,
        priority: 'HIGH',
        completed: false,
      },
      create: {
        id: 'e2e-deadline',
        userId: student.id,
        title: 'E2E Project Checkpoint',
        course: 'E2E 101',
        dueDate: deadlineDate,
        priority: 'HIGH',
        completed: false,
      },
    }),
    prisma.facultyFavorite.upsert({
      where: {
        facultyId_userId: {
          facultyId: faculty.id,
          userId: student.id,
        },
      },
      update: {},
      create: {
        facultyId: faculty.id,
        userId: student.id,
      },
    }),
    prisma.notification.upsert({
      where: { id: 'e2e-notification' },
      update: {
        userId: student.id,
        type: NotificationType.NEW_EVENT,
        title: 'E2E event posted',
        message: 'E2E Welcome Night is ready for students.',
        actionUrl: `/events/${event.id}`,
        actionLabel: 'View event',
        read: false,
        clearedAt: null,
      },
      create: {
        id: 'e2e-notification',
        userId: student.id,
        type: NotificationType.NEW_EVENT,
        title: 'E2E event posted',
        message: 'E2E Welcome Night is ready for students.',
        actionUrl: `/events/${event.id}`,
        actionLabel: 'View event',
        read: false,
      },
    }),
    prisma.announcement.upsert({
      where: { id: 'e2e-announcement' },
      update: {
        universityId,
        createdById: adminUser.id,
        title: 'E2E campus update',
        message: 'A deterministic campus update for smoke testing.',
        isActive: true,
        expiresAt: null,
      },
      create: {
        id: 'e2e-announcement',
        universityId,
        createdById: adminUser.id,
        title: 'E2E campus update',
        message: 'A deterministic campus update for smoke testing.',
        isActive: true,
      },
    }),
  ]);

  await Promise.all([
    prisma.notificationPreferences.upsert({
      where: { userId: student.id },
      update: {
        buildingIds: [buildingId],
        clubInterestIds: [clubId],
        resourceLinkIds: [resourceLinkId],
      },
      create: {
        userId: student.id,
        buildingIds: [buildingId],
        clubInterestIds: [clubId],
        resourceLinkIds: [resourceLinkId],
      },
    }),
    prisma.notificationPreferences.upsert({
      where: { userId: facultyUser.id },
      update: {},
      create: { userId: facultyUser.id },
    }),
    prisma.notificationPreferences.upsert({
      where: { userId: adminUser.id },
      update: {},
      create: { userId: adminUser.id },
    }),
  ]);

  console.log('E2E fixtures are ready.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
