import { prisma } from '@/lib/prisma';
import { formatFacultyAvailability } from '@/lib/faculty';
import { getActiveAnnouncementWhere, getAnnouncementAudienceLabel, purgeExpiredAnnouncements } from '@/lib/server/announcements';
import { isMissingDatabaseFieldError } from '@/lib/server/dbCompatibility';
import { getBuildingsCached, getCampusServicesCached, getClubsCached, getFacultyCached, getResourceLinksCached, } from '@/lib/server/universityData';

/** @typedef {'announcements' | 'events' | 'faculty' | 'services' | 'resourceLinks' | 'buildings' | 'clubs' | 'officeHours' | 'userDeadlines'} AIContextSection */
/** @typedef {{ sections: AIContextSection[] }} AIContextQueryPlan */

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
];
const DEFAULT_QUERY_SECTIONS = [
    'announcements',
    'events',
    'faculty',
    'services',
    'resourceLinks',
    'buildings',
    'clubs',
];
const SECTION_PATTERNS = {
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
};
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
];
const BROAD_QUERY_PATTERNS = [
    /\bwhat can you do\b/,
    /\bwhat do you know\b/,
    /\boverview\b/,
    /\bsummary of\b/,
    /\ball campus\b/,
    /\beverything\b/,
];
const SEARCH_STOP_WORDS = new Set([
    'a',
    'all',
    'an',
    'and',
    'any',
    'are',
    'at',
    'assistant',
    'building',
    'buildings',
    'campus',
    'can',
    'clubs',
    'club',
    'directory',
    'directories',
    'do',
    'event',
    'events',
    'faculty',
    'for',
    'from',
    'give',
    'help',
    'i',
    'info',
    'information',
    'is',
    'it',
    'links',
    'list',
    'me',
    'my',
    'of',
    'on',
    'or',
    'organization',
    'organizations',
    'please',
    'professor',
    'professors',
    'resource',
    'resources',
    'service',
    'services',
    'show',
    'student',
    'students',
    'tell',
    'the',
    'their',
    'there',
    'these',
    'those',
    'to',
    'university',
    'announcement',
    'announcements',
    'what',
    'when',
    'where',
    'which',
    'who',
    'with',
]);
const MATCH_RESULT_LIMITS = {
    announcements: 6,
    events: 10,
    faculty: 8,
    services: 8,
    resourceLinks: 8,
    buildings: 8,
    clubs: 8,
    officeHours: 8,
    userDeadlines: 12,
};
function normalizeSearchText(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function uniqueStrings(values) {
    return Array.from(new Set(values.filter(Boolean)));
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function extractSearchTerms(value) {
    const normalizedQuery = normalizeSearchText(value);
    if (!normalizedQuery) {
        return {
            normalizedQuery: '',
            tokens: [],
            phrases: [],
        };
    }
    const rawTokens = normalizedQuery.split(' ');
    const tokens = uniqueStrings(rawTokens.filter((token) => token.length > 1 && !SEARCH_STOP_WORDS.has(token)));
    const phrases = [];
    for (let index = 0; index < tokens.length - 1; index += 1) {
        phrases.push(`${tokens[index]} ${tokens[index + 1]}`);
    }
    for (let index = 0; index < tokens.length - 2; index += 1) {
        phrases.push(`${tokens[index]} ${tokens[index + 1]} ${tokens[index + 2]}`);
    }
    if (normalizedQuery.length <= 100) {
        phrases.push(normalizedQuery);
    }
    return {
        normalizedQuery,
        tokens,
        phrases: uniqueStrings(phrases.filter((phrase) => phrase.length > 3)),
    };
}
function scoreNormalizedField(field, terms, weight) {
    if (!field) {
        return 0;
    }
    let score = 0;
    if (terms.normalizedQuery) {
        if (field === terms.normalizedQuery) {
            score += 30 * weight;
        }
        else if (field.includes(terms.normalizedQuery)) {
            score += 16 * weight;
        }
    }
    for (const phrase of terms.phrases) {
        if (field === phrase) {
            score += 18 * weight;
            continue;
        }
        if (field.includes(phrase)) {
            score += 10 * weight;
        }
    }
    for (const token of terms.tokens) {
        const wholeWordPattern = new RegExp(`\\b${escapeRegExp(token)}\\b`);
        if (wholeWordPattern.test(field)) {
            score += 5 * weight;
            continue;
        }
        if (field.includes(token)) {
            score += 2 * weight;
        }
    }
    return score;
}
function rankRecords(records, terms, buildFields, limit) {
    if (!terms.normalizedQuery || terms.tokens.length === 0) {
        return [];
    }
    return records
        .map((item) => {
        const { primary, secondary = [] } = buildFields(item);
        const score = primary.reduce((total, field) => total + scoreNormalizedField(normalizeSearchText(field), terms, 3), 0) +
            secondary.reduce((total, field) => total + scoreNormalizedField(normalizeSearchText(field), terms, 1), 0);
        return { item, score };
    })
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, limit)
        .map((entry) => entry.item);
}
function truncateText(value, maxLength) {
    const normalized = value?.trim();
    if (!normalized) {
        return null;
    }
    if (normalized.length <= maxLength) {
        return normalized;
    }
    return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}
function selectOverviewRecords(records, section) {
    const limit = MATCH_RESULT_LIMITS[section] ?? 8;
    return records.length <= limit * 2 ? records : records.slice(0, limit);
}
function renderFacultyLine(faculty) {
    return (`• ${faculty.name} (${faculty.title}), ${faculty.department}` +
        ` — Office: ${faculty.officeLocation}, Hours: ${faculty.officeHours}` +
        `, Email: ${faculty.email}` +
        (faculty.phone ? `, Phone: ${faculty.phone}` : '') +
        `, Availability: ${formatFacultyAvailability(faculty.availabilityStatus, faculty.availabilityNote)}` +
        (faculty.courses.length > 0 ? `, Courses: ${faculty.courses.join(', ')}` : '') +
        (faculty.tags.length > 0 ? `, Tags: ${faculty.tags.join(', ')}` : '') +
        (faculty.bio ? `, Bio: ${truncateText(faculty.bio, 180)}` : ''));
}
function renderBuildingLine(building) {
    return (`• ${building.name}${building.code ? ` (${building.code})` : ''} — ${building.type}, ${building.address}` +
        (building.purpose ? ` | Purpose: ${building.purpose}` : '') +
        (building.description ? ` | About: ${truncateText(building.description, 180)}` : '') +
        (building.operatingHours ? ` | Hours: ${building.operatingHours}` : '') +
        ` | Status: ${building.operationalStatus}` +
        (building.operationalNote ? ` (${building.operationalNote})` : '') +
        (building.accessibilityNotes ? ` | Accessibility: ${truncateText(building.accessibilityNotes, 140)}` : '') +
        (building.categories.length > 0 ? ` | Categories: ${building.categories.join(', ')}` : '') +
        (building.services.length > 0 ? ` | Services: ${building.services.join(', ')}` : '') +
        (building.departments.length > 0 ? ` | Departments: ${building.departments.join(', ')}` : ''));
}
function renderClubLine(club) {
    return (`• ${club.name} (${club.category})` +
        ` — ${truncateText(club.description, 180)}` +
        (club.meetingInfo ? ` | Meetings: ${club.meetingInfo}` : '') +
        (club.contactEmail ? ` | Contact: ${club.contactEmail}` : '') +
        (club.websiteUrl ? ` | Website: ${club.websiteUrl}` : ''));
}
function renderServiceLine(service) {
    return (`• ${service.name} — ${service.status}, ${service.location}` +
        (service.hours ? ` | Hours: ${service.hours}` : '') +
        (service.directionsUrl ? ` | Directions: ${service.directionsUrl}` : ''));
}
function renderResourceLinkLine(resourceLink) {
    return (`• ${resourceLink.label} [${resourceLink.category}]` +
        ` — ${resourceLink.href}` +
        (resourceLink.description ? ` | ${truncateText(resourceLink.description, 180)}` : ''));
}
async function loadAnnouncementContext(universityId, limit) {
    await purgeExpiredAnnouncements(universityId);
    try {
        return await prisma.announcement.findMany({
            where: {
                universityId,
                ...getActiveAnnouncementWhere(),
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
        });
    }
    catch (error) {
        if (!isMissingDatabaseFieldError(error)) {
            throw error;
        }
        return prisma.announcement.findMany({
            where: { isActive: true },
            select: {
                title: true,
                message: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        }).then((announcements) => announcements.map((item) => ({
            ...item,
            scope: 'CAMPUS',
            building: null,
            service: null,
        })));
    }
}
const SECTION_LIMITS = {
    announcements: 5,
    events: 15,
    faculty: 20,
    services: 20,
    resourceLinks: 20,
    buildings: 25,
    clubs: 20,
    officeHours: 20,
    userDeadlines: 12,
};
function includesPattern(value, patterns) {
    return patterns.some((pattern) => pattern.test(value));
}
function toSectionSet(sections) {
    if (!sections) {
        return new Set(AI_CONTEXT_SECTIONS);
    }
    return new Set(sections);
}
/**
 * @param {string} userMessage
 * @returns {AIContextQueryPlan}
 */
export function buildAIContextQueryPlan(userMessage) {
    const normalized = userMessage.toLowerCase();
    if (includesPattern(normalized, STUDENT_SCHEDULE_PATTERNS)) {
        return { sections: [] };
    }
    if (includesPattern(normalized, BROAD_QUERY_PATTERNS)) {
        return { sections: [...AI_CONTEXT_SECTIONS] };
    }
    const requested = new Set();
    for (const section of AI_CONTEXT_SECTIONS) {
        if (includesPattern(normalized, SECTION_PATTERNS[section])) {
            requested.add(section);
        }
    }
    // Office hours questions usually require matching faculty context as well.
    if (requested.has('officeHours')) {
        requested.add('faculty');
    }
    if (requested.size === 0) {
        return { sections: [...DEFAULT_QUERY_SECTIONS] };
    }
    return { sections: Array.from(requested) };
}
/**
 * Gathers university-scoped contextual data for the AI assistant.
 *
 * The result is a structured text block that gets injected into the system
 * prompt so the LLM can give accurate, university-specific answers.
 *
 * @param {string | null | undefined} universityId
 * @param {string | null | undefined} userId
 * @param {{ sections?: AIContextSection[], userQuery?: string }=} options
 * @returns {Promise<string>}
 */
export async function gatherUniversityContext(universityId, userId, options) {
    if (!universityId) {
        return 'The user is not associated with any university. Answer general campus questions as best you can.';
    }
    const now = new Date();
    const selectedSections = toSectionSet(options?.sections);
    const latestUserQuery = options?.userQuery?.trim() ?? '';
    const searchTerms = extractSearchTerms(latestUserQuery);
    const isOverviewQuery = searchTerms.normalizedQuery.length > 0 &&
        includesPattern(searchTerms.normalizedQuery, BROAD_QUERY_PATTERNS);
    const shouldUseSearchMatches = searchTerms.tokens.length > 0 && !isOverviewQuery;
    const shouldInclude = (section) => selectedSections.has(section);
    const [university, faculty, upcomingEvents, services, resourceLinks, buildings, clubs, officeHours, userDeadlines, announcements,] = await Promise.all([
        // University info
        prisma.university.findUnique({
            where: { id: universityId },
            select: { name: true, slug: true, domain: true },
        }),
        // Faculty directory — full university directory, filtered in-memory for prompt relevance
        shouldInclude('faculty')
            ? getFacultyCached(universityId, undefined, undefined, userId)
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
        // Campus services — full university directory, filtered in-memory for prompt relevance
        shouldInclude('services')
            ? getCampusServicesCached(universityId, undefined)
            : Promise.resolve([]),
        // Resource links — full university directory, filtered in-memory for prompt relevance
        shouldInclude('resourceLinks')
            ? getResourceLinksCached(universityId, undefined, undefined)
            : Promise.resolve([]),
        // Buildings — full university directory, filtered in-memory for prompt relevance
        shouldInclude('buildings')
            ? getBuildingsCached(universityId, undefined)
            : Promise.resolve([]),
        // Clubs — full university directory, filtered in-memory for prompt relevance
        shouldInclude('clubs')
            ? getClubsCached(universityId, undefined, undefined)
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
    ]);
    const universityName = university?.name ?? 'Unknown University';
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const facultyMatches = shouldInclude('faculty')
        ? (shouldUseSearchMatches
            ? rankRecords(faculty, searchTerms, (item) => ({
                primary: [item.name, item.department, item.title, item.officeLocation],
                secondary: [
                    item.bio ?? '',
                    item.email,
                    item.phone ?? '',
                    item.officeHours,
                    item.courses.join(' '),
                    item.tags.join(' '),
                ],
            }), MATCH_RESULT_LIMITS.faculty ?? 8)
            : selectOverviewRecords(faculty, 'faculty'))
        : [];
    const eventMatches = shouldInclude('events')
        ? (shouldUseSearchMatches
            ? rankRecords(upcomingEvents, searchTerms, (item) => ({
                primary: [item.title, item.location, item.category],
                secondary: [item.description ?? '', item.organizer ?? '', item.time ?? ''],
            }), MATCH_RESULT_LIMITS.events ?? 10)
            : selectOverviewRecords(upcomingEvents, 'events'))
        : [];
    const serviceMatches = shouldInclude('services')
        ? (shouldUseSearchMatches
            ? rankRecords(services, searchTerms, (item) => ({
                primary: [item.name, item.location],
                secondary: [item.hours, item.status, item.directionsUrl],
            }), MATCH_RESULT_LIMITS.services ?? 8)
            : selectOverviewRecords(services, 'services'))
        : [];
    const resourceLinkMatches = shouldInclude('resourceLinks')
        ? (shouldUseSearchMatches
            ? rankRecords(resourceLinks, searchTerms, (item) => ({
                primary: [item.label, item.category],
                secondary: [item.description, item.href],
            }), MATCH_RESULT_LIMITS.resourceLinks ?? 8)
            : selectOverviewRecords(resourceLinks, 'resourceLinks'))
        : [];
    const buildingMatches = shouldInclude('buildings')
        ? (shouldUseSearchMatches
            ? rankRecords(buildings, searchTerms, (item) => ({
                primary: [item.name, item.code ?? '', item.type, item.address, item.mapQuery],
                secondary: [
                    item.purpose ?? '',
                    item.description ?? '',
                    item.accessibilityNotes ?? '',
                    item.operatingHours ?? '',
                    item.operationalNote ?? '',
                    item.categories.join(' '),
                    item.services.join(' '),
                    item.departments.join(' '),
                ],
            }), MATCH_RESULT_LIMITS.buildings ?? 8)
            : selectOverviewRecords(buildings, 'buildings'))
        : [];
    const clubMatches = shouldInclude('clubs')
        ? (shouldUseSearchMatches
            ? rankRecords(clubs, searchTerms, (item) => ({
                primary: [item.name, item.category],
                secondary: [
                    item.description,
                    item.meetingInfo ?? '',
                    item.contactEmail ?? '',
                    item.websiteUrl ?? '',
                ],
            }), MATCH_RESULT_LIMITS.clubs ?? 8)
            : selectOverviewRecords(clubs, 'clubs'))
        : [];
    const officeHourMatches = shouldInclude('officeHours')
        ? (shouldUseSearchMatches
            ? rankRecords(officeHours, searchTerms, (item) => ({
                primary: [item.faculty.name, item.faculty.department, item.location],
                secondary: [item.mode, dayNames[item.dayOfWeek], item.startTime, item.endTime],
            }), MATCH_RESULT_LIMITS.officeHours ?? 8)
            : selectOverviewRecords(officeHours, 'officeHours'))
        : [];
    const announcementMatches = shouldInclude('announcements')
        ? (shouldUseSearchMatches
            ? rankRecords(announcements, searchTerms, (item) => ({
                primary: [item.title, item.building?.name ?? '', item.service?.name ?? ''],
                secondary: [item.message, item.scope],
            }), MATCH_RESULT_LIMITS.announcements ?? 6)
            : selectOverviewRecords(announcements, 'announcements'))
        : [];
    const anySearchMatches = facultyMatches.length > 0 ||
        eventMatches.length > 0 ||
        serviceMatches.length > 0 ||
        resourceLinkMatches.length > 0 ||
        buildingMatches.length > 0 ||
        clubMatches.length > 0 ||
        officeHourMatches.length > 0 ||
        announcementMatches.length > 0;
    const sections = [];
    // ----- University -----
    sections.push(`UNIVERSITY: ${universityName}` +
        (university?.domain ? ` (email domain: ${university.domain})` : ''));
    sections.push('ASSISTANT LIMITATIONS:\n' +
        '• No access to registrar systems, student schedules, class meeting rooms, or personal calendars.\n' +
        '• Faculty course lists do not include classroom assignments or meeting times.\n' +
        '• Do not infer class locations from office locations, departments, or building names.');
    if (shouldInclude('faculty') ||
        shouldInclude('services') ||
        shouldInclude('resourceLinks') ||
        shouldInclude('buildings') ||
        shouldInclude('clubs')) {
        const coverage = [];
        if (shouldInclude('faculty')) {
            coverage.push(`• Faculty profiles available: ${faculty.length}`);
        }
        if (shouldInclude('buildings')) {
            coverage.push(`• Building records available: ${buildings.length}`);
        }
        if (shouldInclude('clubs')) {
            coverage.push(`• Clubs and organizations available: ${clubs.length}`);
        }
        if (shouldInclude('services')) {
            coverage.push(`• Campus services available: ${services.length}`);
        }
        if (shouldInclude('resourceLinks')) {
            coverage.push(`• Resource links available: ${resourceLinks.length}`);
        }
        sections.push('UNIVERSITY DIRECTORY COVERAGE:\n' + coverage.join('\n'));
    }
    if (shouldUseSearchMatches) {
        sections.push(anySearchMatches
            ? 'QUERY MATCHING:\n• The sections below are filtered to the records that best match the latest user question.'
            : 'QUERY MATCHING:\n• No exact faculty, building, club, service, resource link, event, or announcement matches were found for the latest user question.');
    }
    // ----- Announcements -----
    if (shouldInclude('announcements') && announcementMatches.length > 0) {
        sections.push(`${shouldUseSearchMatches ? 'MATCHED ANNOUNCEMENTS' : 'ACTIVE ANNOUNCEMENTS'}:\n` +
            announcementMatches
                .map((a) => `• [${getAnnouncementAudienceLabel(a)}] ${a.title}: ${a.message}`)
                .join('\n'));
    }
    // ----- Events -----
    if (shouldInclude('events') && eventMatches.length > 0) {
        sections.push(`${shouldUseSearchMatches ? 'MATCHED EVENTS' : 'UPCOMING EVENTS'}:\n` +
            eventMatches
                .map((e) => `• "${e.title}" — ${e.date.toLocaleDateString()} at ${e.time}, ${e.location} [${e.category}]` +
                (e.description ? ` — ${e.description.slice(0, 120)}` : ''))
                .join('\n'));
    }
    else if (shouldInclude('events')) {
        sections.push('UPCOMING EVENTS: None scheduled in the next 30 days.');
    }
    // ----- Faculty -----
    if (shouldInclude('faculty') && facultyMatches.length > 0) {
        sections.push(`${shouldUseSearchMatches ? 'MATCHED FACULTY DIRECTORY' : 'FACULTY DIRECTORY'}:\n` +
            facultyMatches.map((item) => renderFacultyLine(item)).join('\n'));
    }
    // ----- Office Hours Detail -----
    if (shouldInclude('officeHours') && officeHourMatches.length > 0) {
        sections.push(`${shouldUseSearchMatches ? 'MATCHED OFFICE HOURS' : 'OFFICE HOURS SCHEDULE'}:\n` +
            officeHourMatches
                .map((oh) => `• ${oh.faculty.name} (${oh.faculty.department}): ${dayNames[oh.dayOfWeek]} ${oh.startTime}–${oh.endTime}` +
                `, ${oh.location} [${oh.mode}]${oh.isActive ? ' (currently active)' : ''}`)
                .join('\n'));
    }
    // ----- Services -----
    if (shouldInclude('services') && serviceMatches.length > 0) {
        sections.push(`${shouldUseSearchMatches ? 'MATCHED CAMPUS SERVICES' : 'CAMPUS SERVICES'}:\n` +
            serviceMatches.map((item) => renderServiceLine(item)).join('\n'));
    }
    // ----- Buildings -----
    if (shouldInclude('buildings') && buildingMatches.length > 0) {
        sections.push(`${shouldUseSearchMatches ? 'MATCHED CAMPUS BUILDINGS' : 'CAMPUS BUILDINGS'}:\n` +
            buildingMatches.map((item) => renderBuildingLine(item)).join('\n'));
    }
    // ----- Resource Links -----
    if (shouldInclude('resourceLinks') && resourceLinkMatches.length > 0) {
        sections.push(`${shouldUseSearchMatches ? 'MATCHED RESOURCE LINKS' : 'RESOURCE LINKS'}:\n` +
            resourceLinkMatches.map((item) => renderResourceLinkLine(item)).join('\n'));
    }
    // ----- Clubs -----
    if (shouldInclude('clubs') && clubMatches.length > 0) {
        sections.push(`${shouldUseSearchMatches ? 'MATCHED CLUBS & ORGANIZATIONS' : 'CLUBS & ORGANIZATIONS'}:\n` +
            clubMatches.map((item) => renderClubLine(item)).join('\n'));
    }
    // ----- User's Deadlines -----
    if (shouldInclude('userDeadlines') && userDeadlines.length > 0) {
        sections.push('YOUR UPCOMING DEADLINES:\n' +
            userDeadlines
                .map((d) => `• "${d.title}" for ${d.course} — due ${d.dueDate.toLocaleDateString()} [${d.priority}]`)
                .join('\n'));
    }
    const context = sections.join('\n\n');
    // Safety cap: keep the context under ~25K chars (~6K tokens) to avoid
    // blowing Groq rate-limits or context windows on smaller models.
    const MAX_CONTEXT_CHARS = 25_000;
    if (context.length > MAX_CONTEXT_CHARS) {
        return context.slice(0, MAX_CONTEXT_CHARS) + '\n\n[Context trimmed for length]';
    }
    return context;
}
