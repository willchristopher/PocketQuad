import {
  PrismaClient,
  UserRole,
  ChannelType,
  EventCategory,
  OfficeHourMode,
  CalendarEventType,
  DeadlinePriority,
  NotificationType,
  CampusServiceStatus,
  ResourceLinkCategory,
} from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const northValley = await prisma.university.upsert({
    where: { slug: 'north-valley-university' },
    update: {
      name: 'North Valley University',
      domain: 'northvalley.edu',
    },
    create: {
      name: 'North Valley University',
      slug: 'north-valley-university',
      domain: 'northvalley.edu',
    },
  })

  await prisma.university.upsert({
    where: { slug: 'lakeside-state-college' },
    update: {
      name: 'Lakeside State College',
      domain: 'lakeside.edu',
    },
    create: {
      name: 'Lakeside State College',
      slug: 'lakeside-state-college',
      domain: 'lakeside.edu',
    },
  })

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'student1@pocketquad.edu' },
      update: {
        universityId: northValley.id,
      },
      create: {
        email: 'student1@pocketquad.edu',
        displayName: 'Alex Student',
        firstName: 'Alex',
        lastName: 'Student',
        role: UserRole.STUDENT,
        major: 'Computer Science',
        year: 'Junior',
        universityId: northValley.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'faculty1@pocketquad.edu' },
      update: {
        universityId: northValley.id,
      },
      create: {
        email: 'faculty1@pocketquad.edu',
        displayName: 'Dr. Rivera',
        firstName: 'Maya',
        lastName: 'Rivera',
        role: UserRole.FACULTY,
        department: 'Computer Science',
        universityId: northValley.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'admin1@pocketquad.edu' },
      update: {
        universityId: northValley.id,
      },
      create: {
        email: 'admin1@pocketquad.edu',
        displayName: 'Taylor Admin',
        firstName: 'Taylor',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        universityId: northValley.id,
      },
    }),
  ])

  await Promise.all(
    users.map((user) =>
      prisma.notificationPreferences.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      }),
    ),
  )

  const [student] = users
  const [, faculty] = users

  const generalChannel = await prisma.channel.upsert({
    where: { id: 'seed-general-channel' },
    update: {},
    create: {
      id: 'seed-general-channel',
      name: 'General',
      description: 'Campus-wide updates and conversation',
      type: ChannelType.PUBLIC,
      createdById: faculty.id,
    },
  })

  await Promise.all(
    users.map((user) =>
      prisma.channelMember.upsert({
        where: {
          channelId_userId: {
            channelId: generalChannel.id,
            userId: user.id,
          },
        },
        update: {},
        create: {
          channelId: generalChannel.id,
          userId: user.id,
          role: user.id === faculty.id ? 'admin' : 'member',
        },
      }),
    ),
  )

  const event = await prisma.event.create({
    data: {
      title: 'Hack Night',
      description: 'Bring your project and collaborate with peers.',
      date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      time: '7:00 PM',
      location: 'Engineering Hall',
      category: EventCategory.ACADEMIC,
      organizer: 'Computer Science Club',
      organizerId: faculty.id,
      universityId: northValley.id,
    },
  })

  const facultyProfile = await prisma.faculty.upsert({
    where: { userId: faculty.id },
    update: {
      universityId: northValley.id,
    },
    create: {
      userId: faculty.id,
      name: 'Dr. Maya Rivera',
      title: 'Associate Professor',
      department: 'Computer Science',
      email: faculty.email,
      officeLocation: 'CS Building 420',
      officeHours: 'Tue/Thu 2:00 PM - 4:00 PM',
      courses: ['CS 301', 'CS 410'],
      tags: ['algorithms', 'systems'],
      universityId: northValley.id,
    },
  })

  await prisma.officeHour.create({
    data: {
      facultyId: facultyProfile.id,
      userId: faculty.id,
      dayOfWeek: 2,
      startTime: '14:00',
      endTime: '16:00',
      location: 'CS Building 420',
      mode: OfficeHourMode.IN_PERSON,
    },
  })

  await prisma.calendarEvent.create({
    data: {
      userId: student.id,
      title: 'Study Group',
      start: new Date(Date.now() + 1000 * 60 * 60 * 24),
      end: new Date(Date.now() + 1000 * 60 * 60 * 26),
      type: CalendarEventType.PERSONAL,
      location: 'Library',
    },
  })

  await prisma.deadline.create({
    data: {
      userId: student.id,
      title: 'Project Milestone 1',
      course: 'CS 410',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      priority: DeadlinePriority.HIGH,
    },
  })

  await prisma.notification.create({
    data: {
      userId: student.id,
      type: NotificationType.NEW_EVENT,
      title: 'New Campus Event',
      message: `${event.title} was just posted.`,
      actionUrl: `/events/${event.id}`,
      actionLabel: 'View event',
    },
  })

  await prisma.campusBuilding.upsert({
    where: { id: 'seed-building-lib' },
    update: {},
    create: {
      id: 'seed-building-lib',
      universityId: northValley.id,
      name: 'Main Library',
      code: 'LIB',
      type: 'Resource',
      address: '110 Campus Loop',
      mapQuery: 'Main Library North Valley University',
    },
  })

  await prisma.campusBuilding.upsert({
    where: { id: 'seed-building-eng' },
    update: {},
    create: {
      id: 'seed-building-eng',
      universityId: northValley.id,
      name: 'Engineering Hall',
      code: 'ENG',
      type: 'Event Venue',
      address: '42 Innovation Drive',
      mapQuery: 'Engineering Hall North Valley University',
    },
  })

  await prisma.campusService.upsert({
    where: { id: 'seed-service-library' },
    update: {},
    create: {
      id: 'seed-service-library',
      universityId: northValley.id,
      name: 'Main Library',
      status: CampusServiceStatus.OPEN,
      hours: '8:00 AM - 11:00 PM',
      location: 'Library Complex',
      directionsUrl: 'https://maps.google.com/?q=Main+Library+Campus',
    },
  })

  await prisma.campusService.upsert({
    where: { id: 'seed-service-health' },
    update: {},
    create: {
      id: 'seed-service-health',
      universityId: northValley.id,
      name: 'Student Health Center',
      status: CampusServiceStatus.LIMITED,
      hours: '10:00 AM - 4:00 PM (walk-in only)',
      location: 'Health Services Center',
      directionsUrl: 'https://maps.google.com/?q=Student+Health+Center',
    },
  })

  await prisma.campusResourceLink.upsert({
    where: { id: 'seed-link-canvas' },
    update: {},
    create: {
      id: 'seed-link-canvas',
      universityId: northValley.id,
      label: 'Canvas',
      category: ResourceLinkCategory.LEARNING,
      href: 'https://canvas.instructure.com/',
      description: 'Course modules, assignments, and gradebook.',
    },
  })

  await prisma.campusResourceLink.upsert({
    where: { id: 'seed-link-email' },
    update: {},
    create: {
      id: 'seed-link-email',
      universityId: northValley.id,
      label: 'Campus Email',
      category: ResourceLinkCategory.COMMUNICATION,
      href: 'https://mail.google.com/',
      description: 'Official university email and announcements.',
    },
  })

  await prisma.clubOrganization.upsert({
    where: { id: 'seed-club-cs' },
    update: {},
    create: {
      id: 'seed-club-cs',
      universityId: northValley.id,
      name: 'Computer Science Society',
      category: 'Academic',
      description: 'Weekly workshops and hackathon prep events.',
      contactEmail: 'css@northvalley.edu',
      websiteUrl: 'https://northvalley.edu/css',
      meetingInfo: 'Wednesdays at 6 PM, Engineering Hall 210',
    },
  })

  await prisma.clubOrganization.upsert({
    where: { id: 'seed-club-robotics' },
    update: {},
    create: {
      id: 'seed-club-robotics',
      universityId: northValley.id,
      name: 'Robotics Club',
      category: 'STEM',
      description: 'Build autonomous robots and compete regionally.',
      contactEmail: 'robotics@northvalley.edu',
      websiteUrl: 'https://northvalley.edu/robotics',
      meetingInfo: 'Fridays at 4 PM, Innovation Lab',
    },
  })

  await prisma.quickLink.createMany({
    data: [
      { label: 'Library', href: '/library', icon: 'book-open', color: 'blue', order: 1 },
      { label: 'Grades', href: '/grades', icon: 'graduation-cap', color: 'green', order: 2 },
      { label: 'Advising', href: '/advisor', icon: 'users', color: 'orange', order: 3 },
    ],
    skipDuplicates: true,
  })

  await prisma.announcement.create({
    data: {
      title: 'Welcome to PocketQuad',
      message: 'Backend seed data is ready. Connect frontend pages to API routes next.',
      isActive: true,
    },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
