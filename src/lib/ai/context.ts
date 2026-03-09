import { prisma } from '@/lib/prisma'
import {
  formatFacultyAvailability,
  parseLegacyFacultyAvailability,
} from '@/lib/faculty'
import { getAnnouncementAudienceLabel } from '@/lib/server/announcements'
import { isMissingDatabaseFieldError } from '@/lib/server/dbCompatibility'

export const AI_CONTEXT_SECTIONS = [
  'announcements',
  'events',
  'faculty',
  'services',
  'resourceLinks',
  'buildings',
  'clubs',
  'officeHours',
  'userDeadlines',
] as const

export type AIContextSection = (typeof AI_CONTEXT_SECTIONS)[number]

export interface AIContextQueryPlan {
  sections: AIContextSection[]
}

const DEFAULT_QUERY_SECTIONS: AIContextSection[] = [
  'announcements',
  'events',
  'services',
  'resourceLinks',
]

const SECTION_PATTERNS: Record<AIContextSection, RegExp[]> = {
  announcements: [/\bannouncement(s)?\b/, /\balert(s)?\b/, /\bnotice(s)?\b/, /\bnews\b/, /\bupdate(s)?\b/],
  events: [
    /\bevent(s)?\b/,
    /\bhappening(s)?\b/,
    /\bworkshop(s)?\b/,
    /\bseminar(s)?\b/,
    /\blecture(s)?\b/,
    /\bfestival(s)?\b/,
    /\bfair(s)?\b/,
    /\bactivity\b/,
    /\bactivities\b/,
  ],
  faculty: [
    /\bfaculty\b/,
    /\bprofessor(s)?\b/,
    /\binstructor(s)?\b/,
    /\badvisor(s)?\b/,
    /\bteacher(s)?\b/,
    /\bdepartment(s)?\b/,
    /\bdean(s)?\b/,
  ],
  services: [
    /\bservice(s)?\b/,
    /\bdining\b/,
    /\bcafeteria(s)?\b/,
    /\blibrary\b/,
    /\bparking\b/,
    /\bshuttle\b/,
    /\btransport\b/,
    /\bhealth\b/,
    /\bcounsel(l)?ing\b/,
    /\bsupport\b/,
  ],
  resourceLinks: [
    /\blink(s)?\b/,
    /\bwebsite(s)?\b/,
    /\bportal(s)?\b/,
    /\bresource(s)?\b/,
    /\burl(s)?\b/,
    /\bform(s)?\b/,
  ],
  buildings: [
    /\bbuilding(s)?\b/,
    /\bmap(s)?\b/,
    /\blocation(s)?\b/,
    /\blocated\b/,
    /\bhall(s)?\b/,
    /\bcenter\b/,
    /\bcentre\b/,
    /\broom(s)?\b/,
  ],
  clubs: [
    /\bclub(s)?\b/,
    /\borganization(s)?\b/,
    /\bsociet(y|ies)\b/,
    /\bstudent group(s)?\b/,
  ],
  officeHours: [
    /\boffice hour(s)?\b/,
    /\bdrop[\s-]?in\b/,
    /\bavailability\b/,
    /\bavailable\b/,
    /\bappointment(s)?\b/,
  ],
  userDeadlines: [
    /\bdeadline(s)?\b/,
    /\bdue\b/,
    /\bassignment(s)?\b/,
    /\bproject(s)?\b/,
    /\bexam(s)?\b/,
    /\bquiz(zes)?\b/,
    /\bhomework\b/,
    /\bpriorit(y|ize|izing)\b/,
  ],
}

const STUDENT_SCHEDULE_PATTERNS = [
  /\bmy schedule\b/,
  /\bstudent schedule\b/,
  /\bclass schedule\b/,
  /\bpersonal calendar\b/,
  /\bmy calendar\b/,
  /\bwhere is my class\b/,
  /\bwhen is my class\b/,
  /\bwhere is .* class\b/,
  /\bwhat room\b/,
  /\bclassroom\b/,
]

const BROAD_QUERY_PATTERNS = [
  /\bwhat can you do\b/,
  /\bwhat do you know\b/,
  /\boverview\b/,
  /\bsummary of\b/,
  /\ball campus\b/,
  /\beverything\b/,
]

async function loadFacultyContext(universityId: string, limit: number) {
  try {
    return await prisma.faculty.findMany({
      where: { universityId },
      select: {
        name: true,
        title: true,
        department: true,
        email: true,
        officeLocation: true,
        officeHours: true,
        courses: true,
        phone: true,
        tags: true,
        availabilityStatus: true,
        availabilityNote: true,
      },
      orderBy: { name: 'asc' },
      take: limit,
    })
  } catch (error) {
    if (!isMissingDatabaseFieldError(error)) {
      throw error
    }

    const faculty = await prisma.faculty.findMany({
      where: { universityId },
      select: {
        name: true,
        title: true,
        department: true,
        email: true,
        officeLocation: true,
        officeHours: true,
        courses: true,
        phone: true,
        tags: true,
      },
      orderBy: { name: 'asc' },
      take: limit,
    })

    return faculty.map((item) => {
      const availability = parseLegacyFacultyAvailability(item.officeHours)
      return {
        ...item,
        availabilityStatus: availability.status,
        availabilityNote: availability.note || null,
      }
    })
  }
}

async function loadAnnouncementContext(universityId: string, limit: number) {
  const now = new Date()

  try {
    return await prisma.announcement.findMany({
      where: {
        isActive: true,
        universityId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        scope: true,
        title: true,
        message: true,
        building: {
          select: {
            name: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  } catch (error) {
    if (!isMissingDatabaseFieldError(error)) {
      throw error
    }

    return prisma.announcement.findMany({
      where: { isActive: true },
      select: {
        title: true,
        message: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }).then((announcements) =>
      announcements.map((item) => ({
        ...item,
        scope: 'CAMPUS' as const,
        building: null,
        service: null,
      })),
    )
  }
}

const SECTION_LIMITS: Record<AIContextSection, number> = {
  announcements: 5,
  events: 15,
  faculty: 20,
  services: 20,
  resourceLinks: 20,
  buildings: 25,
  clubs: 20,
  officeHours: 20,
  userDeadlines: 12,
}

function includesPattern(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value))
}

function toSectionSet(sections?: AIContextSection[]): Set<AIContextSection> {
  if (!sections) {
    return new Set(AI_CONTEXT_SECTIONS)
  }

  return new Set(sections)
}

export function buildAIContextQueryPlan(userMessage: string): AIContextQueryPlan {
  const normalized = userMessage.toLowerCase()

  if (includesPattern(normalized, STUDENT_SCHEDULE_PATTERNS)) {
    return { sections: [] }
  }

  if (includesPattern(normalized, BROAD_QUERY_PATTERNS)) {
    return { sections: [...AI_CONTEXT_SECTIONS] }
  }

  const requested = new Set<AIContextSection>()

  for (const section of AI_CONTEXT_SECTIONS) {
    if (includesPattern(normalized, SECTION_PATTERNS[section])) {
      requested.add(section)
    }
  }

  // Office hours questions usually require matching faculty context as well.
  if (requested.has('officeHours')) {
    requested.add('faculty')
  }

  if (requested.size === 0) {
    return { sections: [...DEFAULT_QUERY_SECTIONS] }
  }

  return { sections: Array.from(requested) }
}

interface GatherUniversityContextOptions {
  sections?: AIContextSection[]
}

/**
 * Gathers university-scoped contextual data for the AI assistant.
 *
 * The result is a structured text block that gets injected into the system
 * prompt so the LLM can give accurate, university-specific answers.
 */
export async function gatherUniversityContext(
  universityId: string | null,
  userId: string,
  options?: GatherUniversityContextOptions,
): Promise<string> {
  if (!universityId) {
    return 'The user is not associated with any university. Answer general campus questions as best you can.'
  }

  const now = new Date()
  const selectedSections = toSectionSet(options?.sections)

  const shouldInclude = (section: AIContextSection) => selectedSections.has(section)

  const [
    university,
    faculty,
    upcomingEvents,
    services,
    resourceLinks,
    buildings,
    clubs,
    officeHours,
    userDeadlines,
    announcements,
  ] = await Promise.all([
    // University info
    prisma.university.findUnique({
      where: { id: universityId },
      select: { name: true, slug: true, domain: true },
    }),

    // Faculty directory — scoped to university
    shouldInclude('faculty')
      ? loadFacultyContext(universityId, SECTION_LIMITS.faculty)
      : Promise.resolve([]),

    // Upcoming events — scoped to university, next 30 days
    shouldInclude('events')
      ? prisma.event.findMany({
          where: {
            universityId,
            date: { gte: now },
            isPublished: true,
            isCancelled: false,
          },
          select: {
            title: true,
            description: true,
            date: true,
            time: true,
            location: true,
            category: true,
            organizer: true,
            maxAttendees: true,
          },
          orderBy: { date: 'asc' },
          take: SECTION_LIMITS.events,
        })
      : Promise.resolve([]),

    // Campus services — scoped to university
    shouldInclude('services')
      ? prisma.campusService.findMany({
          where: { universityId },
          select: {
            name: true,
            status: true,
            hours: true,
            location: true,
          },
          orderBy: { name: 'asc' },
          take: SECTION_LIMITS.services,
        })
      : Promise.resolve([]),

    // Resource links — scoped to university
    shouldInclude('resourceLinks')
      ? prisma.campusResourceLink.findMany({
          where: { universityId },
          select: {
            label: true,
            category: true,
            href: true,
            description: true,
          },
          orderBy: { label: 'asc' },
          take: SECTION_LIMITS.resourceLinks,
        })
      : Promise.resolve([]),

    // Buildings — scoped to university and capped to control prompt size
    shouldInclude('buildings')
      ? prisma.campusBuilding.findMany({
          where: { universityId },
          select: {
            name: true,
            code: true,
            type: true,
            address: true,
            description: true,
            accessibilityNotes: true,
            operatingHours: true,
            operationalStatus: true,
            operationalNote: true,
            categories: true,
            services: true,
            departments: true,
            events: {
              where: {
                isPublished: true,
                isCancelled: false,
                date: { gte: now },
              },
              select: {
                title: true,
                date: true,
                time: true,
              },
              orderBy: { date: 'asc' },
              take: 2,
            },
          },
          orderBy: { name: 'asc' },
          take: SECTION_LIMITS.buildings,
        })
      : Promise.resolve([]),

    // Clubs — scoped to university
    shouldInclude('clubs')
      ? prisma.clubOrganization.findMany({
          where: { universityId },
          select: {
            name: true,
            category: true,
            description: true,
            meetingInfo: true,
            contactEmail: true,
            websiteUrl: true,
          },
          orderBy: { name: 'asc' },
          take: SECTION_LIMITS.clubs,
        })
      : Promise.resolve([]),

    // Office hours — from faculty at this university, active slots
    shouldInclude('officeHours')
      ? prisma.officeHour.findMany({
          where: {
            faculty: { universityId },
          },
          select: {
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            location: true,
            mode: true,
            isActive: true,
            faculty: {
              select: { name: true, department: true },
            },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          take: SECTION_LIMITS.officeHours,
        })
      : Promise.resolve([]),

    // The asking user's upcoming deadlines
    shouldInclude('userDeadlines')
      ? prisma.deadline.findMany({
          where: {
            userId,
            dueDate: { gte: now },
            completed: false,
          },
          select: {
            title: true,
            course: true,
            dueDate: true,
            priority: true,
          },
          orderBy: { dueDate: 'asc' },
          take: SECTION_LIMITS.userDeadlines,
        })
      : Promise.resolve([]),

    // Active campus-wide announcements
    shouldInclude('announcements')
      ? loadAnnouncementContext(universityId, SECTION_LIMITS.announcements)
      : Promise.resolve([]),
  ])

  const universityName = university?.name ?? 'Unknown University'
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const sections: string[] = []

  // ----- University -----
  sections.push(
    `UNIVERSITY: ${universityName}` +
      (university?.domain ? ` (email domain: ${university.domain})` : ''),
  )

  sections.push(
    'ASSISTANT LIMITATIONS:\n' +
      '• No access to registrar systems, student schedules, class meeting rooms, or personal calendars.\n' +
      '• Faculty course lists do not include classroom assignments or meeting times.\n' +
      '• Do not infer class locations from office locations, departments, or building names.',
  )

  // ----- Announcements -----
  if (shouldInclude('announcements') && announcements.length > 0) {
    sections.push(
      'ACTIVE ANNOUNCEMENTS:\n' +
        announcements
          .map((a) => `• [${getAnnouncementAudienceLabel(a)}] ${a.title}: ${a.message}`)
          .join('\n'),
    )
  }

  // ----- Events -----
  if (shouldInclude('events') && upcomingEvents.length > 0) {
    sections.push(
      'UPCOMING EVENTS:\n' +
        upcomingEvents
          .map(
            (e) =>
              `• "${e.title}" — ${e.date.toLocaleDateString()} at ${e.time}, ${e.location} [${e.category}]` +
              (e.description ? ` — ${e.description.slice(0, 120)}` : ''),
          )
          .join('\n'),
    )
  } else if (shouldInclude('events')) {
    sections.push('UPCOMING EVENTS: None scheduled in the next 30 days.')
  }

  // ----- Faculty -----
  if (shouldInclude('faculty') && faculty.length > 0) {
    sections.push(
      'FACULTY DIRECTORY:\n' +
        faculty
          .map(
            (f) =>
              `• ${f.name} (${f.title}), ${f.department}` +
              ` — Office: ${f.officeLocation}, Hours: ${f.officeHours}` +
              (f.courses.length > 0 ? `, Courses: ${f.courses.join(', ')}` : '') +
              `, Email: ${f.email}` +
              (f.phone ? `, Phone: ${f.phone}` : '') +
              `, Availability: ${formatFacultyAvailability(f.availabilityStatus, f.availabilityNote)}` +
              (f.tags.length > 0 ? `, Tags: ${f.tags.join(', ')}` : ''),
          )
          .join('\n'),
    )
  }

  // ----- Office Hours Detail -----
  if (shouldInclude('officeHours') && officeHours.length > 0) {
    sections.push(
      'OFFICE HOURS SCHEDULE:\n' +
        officeHours
          .map(
            (oh) =>
              `• ${oh.faculty.name} (${oh.faculty.department}): ${dayNames[oh.dayOfWeek]} ${oh.startTime}–${oh.endTime}` +
              `, ${oh.location} [${oh.mode}]${oh.isActive ? ' (currently active)' : ''}`,
          )
          .join('\n'),
    )
  }

  // ----- Services -----
  if (shouldInclude('services') && services.length > 0) {
    sections.push(
      'CAMPUS SERVICES:\n' +
        services
          .map((s) => `• ${s.name}: ${s.status} — ${s.hours}, ${s.location}`)
          .join('\n'),
    )
  }

  // ----- Buildings -----
  if (shouldInclude('buildings') && buildings.length > 0) {
    sections.push(
      'CAMPUS BUILDINGS:\n' +
        buildings
          .map(
            (b) =>
              `• ${b.name}${b.code ? ` (${b.code})` : ''} — ${b.type}, ${b.address}` +
              (b.description ? ` — ${b.description.slice(0, 100)}` : '') +
              (b.operatingHours ? ` | Hours: ${b.operatingHours}` : '') +
              ` | Status: ${b.operationalStatus}` +
              (b.operationalNote ? ` (${b.operationalNote})` : '') +
              (b.accessibilityNotes ? ` | Accessibility: ${b.accessibilityNotes.slice(0, 120)}` : '') +
              (b.categories.length > 0 ? ` | Categories: ${b.categories.join(', ')}` : '') +
              (b.services.length > 0 ? ` | Services: ${b.services.slice(0, 5).join(', ')}` : '') +
              (b.departments.length > 0 ? ` | Depts: ${b.departments.slice(0, 4).join(', ')}` : '') +
              (b.events.length > 0
                ? ` | Upcoming: ${b.events
                    .map((event) => `${event.title} on ${event.date.toLocaleDateString()} at ${event.time}`)
                    .join('; ')}`
                : ''),
          )
          .join('\n'),
    )
  }

  // ----- Resource Links -----
  if (shouldInclude('resourceLinks') && resourceLinks.length > 0) {
    sections.push(
      'RESOURCE LINKS:\n' +
        resourceLinks
          .map((r) => `• ${r.label} [${r.category}]: ${r.href} — ${r.description}`)
          .join('\n'),
    )
  }

  // ----- Clubs -----
  if (shouldInclude('clubs') && clubs.length > 0) {
    sections.push(
      'CLUBS & ORGANIZATIONS:\n' +
        clubs
          .map(
            (c) =>
              `• ${c.name} (${c.category}): ${c.description.slice(0, 100)}` +
              (c.meetingInfo ? ` — Meetings: ${c.meetingInfo}` : '') +
              (c.contactEmail ? ` — Contact: ${c.contactEmail}` : ''),
          )
          .join('\n'),
    )
  }

  // ----- User's Deadlines -----
  if (shouldInclude('userDeadlines') && userDeadlines.length > 0) {
    sections.push(
      'YOUR UPCOMING DEADLINES:\n' +
        userDeadlines
          .map(
            (d) =>
              `• "${d.title}" for ${d.course} — due ${d.dueDate.toLocaleDateString()} [${d.priority}]`,
          )
          .join('\n'),
    )
  }

  const context = sections.join('\n\n')

  // Safety cap: keep the context under ~25K chars (~6K tokens) to avoid
  // blowing Groq rate-limits or context windows on smaller models.
  const MAX_CONTEXT_CHARS = 25_000
  if (context.length > MAX_CONTEXT_CHARS) {
    return context.slice(0, MAX_CONTEXT_CHARS) + '\n\n[Context trimmed for length]'
  }

  return context
}
