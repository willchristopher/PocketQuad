import crypto from 'node:crypto';
import { createGroq } from '@ai-sdk/groq';
import { generateObject } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import {
  buildEventMatchKey,
  EVENT_FEED_SOURCE_KEY,
  EVENT_FEED_SYNC_INTERVAL_MS,
  EXTERNAL_CALENDAR_PROVIDERS,
  formatEventTimeLabel,
  isTimeTbaLabel,
  resolveEventDateRange,
  slugifyEventToken,
  uniqueEventTags,
} from '@/lib/events';

export const MURRAY_STATE_EVENTS_FEED_URL =
  'https://api.calendar.moderncampus.net/pubcalendar/0d40d3dd-15e7-46b3-b9bc-b096e9eb396d/rss?category=887be367-bc2b-4da3-9dfa-fbf5b5e95b4b&category=ba36c2cf-2839-4b1c-9b18-a0ccb07266ea&category=d458c991-2b0e-45b9-b457-c9bf43b897cf&category=638c9d05-304f-49d2-a711-4bfcd3012a71&category=46e25997-c41d-439b-930f-ad3177eb589f&category=50fbc395-bed6-4015-8b91-330c19fef841&category=8d9d25dd-5c21-47c8-b523-246af9ffe6f9&category=fb63b8de-f028-4df9-8b35-1b5c1ce526e1&category=76e2277d-4ad6-4f7c-9415-8235b415da0c&category=8ae71ae0-cdcf-40be-b570-c185d50d4323&category=f451b410-b3c2-4dc7-a4aa-3142893f0b9c&category=4a1ce6a6-9c5e-4941-bb60-1f8119b057b4&category=57d13bfa-8aa8-452f-b6ff-ea0d9ba1c12d&category=f76e1c78-fb45-4539-9e90-506158815ee9&url=https%3A%2F%2Fwww.murraystate.edu%2Fcalendar%2Findex.aspx&hash=true';

const ITEM_BLOCK_RE = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
const DATE_ONLY_VALUE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ENTITY_MAP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

const EVENT_CLUSTER_SCHEMA = z.object({
  clusters: z.array(
    z.object({
      label: z.string().trim().min(2).max(40),
      description: z.string().trim().min(10).max(140),
      eventIds: z.array(z.string().trim().min(1)).min(1).max(6),
    }),
  ).min(1).max(4),
});

const EVENT_RECOMMENDATION_SCHEMA = z.object({
  overview: z.string().trim().min(1).max(160),
  cards: z.array(
    z.object({
      eventId: z.string().trim().min(1),
      fitScore: z.number().int().min(1).max(100),
      hook: z.string().trim().min(1).max(60),
      reason: z.string().trim().min(1).max(140),
    }),
  ).min(1).max(8),
});

const LEGACY_FEED_ORGANIZER = 'Murray State Calendar';
const CLUB_TOKEN_STOPWORDS = new Set([
  'club',
  'clubs',
  'organization',
  'organizations',
  'student',
  'students',
  'association',
  'chapter',
  'society',
  'team',
  'university',
  'murray',
  'state',
]);
const CATEGORY_LABELS = {
  ACADEMIC: 'Academic',
  SOCIAL: 'Student life',
  SPORTS: 'Athletics',
  ARTS: 'Arts',
  CAREER: 'Career',
  CLUBS: 'Club activity',
  WELLNESS: 'Wellness',
  OTHER: 'Campus event',
};

const CATEGORY_HINTS = {
  CAREER: [
    'career',
    'internship',
    'resume',
    'recruit',
    'employer',
    'network',
    'job',
    'professional',
  ],
  SPORTS: [
    'game',
    'athletic',
    'basketball',
    'baseball',
    'softball',
    'soccer',
    'volleyball',
    'tennis',
    'football',
    'race',
    'match',
  ],
  ARTS: [
    'concert',
    'theatre',
    'gallery',
    'exhibit',
    'film',
    'music',
    'art',
    'performance',
    'recital',
  ],
  CLUBS: [
    'club',
    'organization',
    'student org',
    'student organization',
    'association',
    'fraternity',
    'sorority',
    'meeting',
  ],
  WELLNESS: [
    'wellness',
    'fitness',
    'mental health',
    'mindfulness',
    'meditation',
    'counseling',
    'yoga',
    'health',
  ],
  SOCIAL: [
    'social',
    'mixer',
    'welcome',
    'party',
    'festival',
    'movie night',
    'free food',
    'celebration',
    'community',
  ],
  ACADEMIC: [
    'lecture',
    'seminar',
    'workshop',
    'research',
    'study',
    'faculty',
    'speaker',
    'academic',
    'department',
    'symposium',
  ],
};

function escapeForRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeXmlText(value) {
  return Object.entries(ENTITY_MAP).reduce(
    (next, [entity, replacement]) => next.split(entity).join(replacement),
    value,
  ).replace(/&#(\d+);/g, (_, numericValue) => String.fromCharCode(Number(numericValue)));
}

function stripCdata(value) {
  return value.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
}

function cleanXmlValue(value) {
  return decodeXmlText(stripCdata(String(value ?? '').trim()));
}

function extractBlocks(xml) {
  return Array.from(xml.matchAll(ITEM_BLOCK_RE), (match) => match[1]);
}

function extractTagValues(block, tagNames) {
  const values = [];
  tagNames.forEach((tagName) => {
    const tagPattern = new RegExp(
      `<${escapeForRegex(tagName)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeForRegex(tagName)}>`,
      'gi',
    );

    Array.from(block.matchAll(tagPattern)).forEach((match) => {
      values.push(cleanXmlValue(match[1]));
    });
  });
  return values.filter(Boolean);
}

function extractTagValue(block, tagNames) {
  return extractTagValues(block, tagNames)[0] ?? null;
}

function htmlToText(value) {
  return cleanXmlValue(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractFirstImageUrl(value) {
  const match = String(value ?? '').match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function extractLabeledValue(source, labels) {
  const text = String(source ?? '');
  if (!text) {
    return null;
  }

  const labelPattern = labels.map((label) => escapeForRegex(label)).join('|');
  const match = text.match(
    new RegExp(`(?:^|\\n)\\s*(?:${labelPattern})\\s*:\\s*(.+?)(?=\\n[A-Z][A-Za-z /&-]+\\s*:|$)`, 'i'),
  );
  return match?.[1]?.trim() ?? null;
}

function parseDateValue(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return null;
  }

  const nextValue = trimmed.replace(/\bCST\b|\bCDT\b/gi, '').trim();
  const dateOnlyMatch = nextValue.match(DATE_ONLY_VALUE_RE);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(nextValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function valueIncludesExplicitTime(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return false;
  }

  return /T\d{2}:\d{2}/i.test(trimmed)
    || /\b\d{1,2}:\d{2}\b/.test(trimmed)
    || /\b\d{1,2}\s*(?:AM|PM)\b/i.test(trimmed);
}

function formatRangeLabel(startAt, endAt) {
  if (!startAt) {
    return 'Time TBA';
  }

  const startLabel = formatEventTimeLabel(startAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
  if (!endAt) {
    return startLabel;
  }

  const endLabel = formatEventTimeLabel(endAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

function inferCategory(values) {
  const haystack = values.join(' ').toLowerCase();

  const orderedCategories = ['CAREER', 'SPORTS', 'ARTS', 'CLUBS', 'WELLNESS', 'SOCIAL', 'ACADEMIC'];
  for (const category of orderedCategories) {
    if (CATEGORY_HINTS[category].some((hint) => haystack.includes(hint))) {
      return category;
    }
  }

  return 'OTHER';
}

function deriveKeywordTags(title, description) {
  const stopWords = new Set([
    'about',
    'after',
    'around',
    'campus',
    'event',
    'with',
    'will',
    'your',
    'from',
    'that',
    'this',
    'murray',
    'state',
    'university',
    'students',
    'student',
  ]);

  const counts = new Map();
  const words = `${title} ${description}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !stopWords.has(word));

  words.forEach((word) => {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([word]) => word.replace(/^\w/, (letter) => letter.toUpperCase()));
}

function normalizeEventString(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeClubName(name) {
  return normalizeEventString(name)
    .split(' ')
    .filter((token) => token.length >= 3 && !CLUB_TOKEN_STOPWORDS.has(token));
}

function detectEventSourceType(event) {
  if (event.sourceType) {
    return event.sourceType;
  }

  return event.externalSource || event.syncSource || event.organizer === LEGACY_FEED_ORGANIZER
    ? 'FEED'
    : 'MANUAL';
}

function buildEventHaystack(event) {
  return normalizeEventString([
    event.title,
    event.description,
    event.location,
    event.organizer,
    event.activityLabel,
  ].join(' '));
}

function scoreClubMatch(eventHaystack, club) {
  const normalizedName = normalizeEventString(club.name);
  if (!normalizedName) {
    return 0;
  }

  let score = 0;
  if (eventHaystack.includes(normalizedName)) {
    score += 8;
  }

  const matchedTokens = tokenizeClubName(club.name).filter((token) => eventHaystack.includes(token));
  if (matchedTokens.length > 0) {
    score += matchedTokens.length * 2;
  }

  const categoryToken = normalizeEventString(club.category);
  if (categoryToken && eventHaystack.includes(categoryToken)) {
    score += 1;
  }

  return score;
}

function pickActivityLabel(event, matchedClubs) {
  if (matchedClubs[0]?.name) {
    return matchedClubs[0].name;
  }

  if (event.sourceType === 'FEED' || event.syncSource || event.organizer === LEGACY_FEED_ORGANIZER) {
    return event.organizer && event.organizer !== LEGACY_FEED_ORGANIZER
      ? event.organizer
      : 'Main campus';
  }

  if (event.organizer) {
    return event.organizer;
  }

  return CATEGORY_LABELS[event.category] ?? 'Campus event';
}

export function enrichEventsForAudience(events, options = {}) {
  const clubs = options.clubs ?? [];
  const followedClubIds = new Set(options.followedClubIds ?? []);

  return events.map((event) => {
    const sourceType = detectEventSourceType(event);
    const haystack = buildEventHaystack(event);
    const matchedClubs = clubs
      .map((club) => ({
        id: club.id,
        name: club.name,
        category: club.category,
        score: scoreClubMatch(haystack, club),
      }))
      .filter((club) => club.score >= 4)
      .sort((left, right) => right.score - left.score);

    const clubKeywordSignal =
      event.category === 'CLUBS'
      || /\bclub\b|\bclubs\b|\bstudent org\b|\borganization\b|\borganizations\b/.test(haystack);
    const clubActivity = matchedClubs.length > 0 || clubKeywordSignal;
    const myClubActivity = matchedClubs.some((club) => followedClubIds.has(club.id));
    const originGroup = sourceType === 'FEED'
      ? 'MAIN_CAMPUS'
      : clubActivity
        ? 'CLUB'
        : 'FACULTY';

    return {
      ...event,
      sourceType,
      sourceLabel:
        sourceType === 'FEED'
          ? 'Main campus'
          : clubActivity
            ? 'Club activity'
            : 'Faculty & department',
      originGroup,
      clubActivity,
      myClubActivity,
      matchedClubIds: matchedClubs.map((club) => club.id),
      matchedClubNames: matchedClubs.map((club) => club.name),
      activityLabel: pickActivityLabel(event, matchedClubs),
    };
  });
}

function buildFeedEventFromBlock(block) {
  const title = extractTagValue(block, ['title']) ?? 'Campus event';
  const descriptionHtml = extractTagValue(block, ['description', 'content:encoded']) ?? '';
  const descriptionText = htmlToText(descriptionHtml);
  const categories = extractTagValues(block, ['category', 'dc:subject', 'ev:category', 'cal:calendar', 'cal:tag']);
  const locationName =
    extractTagValue(block, ['cal:location', 'ev:location', 'location']) ??
    extractLabeledValue(descriptionText, ['Location', 'Where']);
  const locationRoom = extractTagValue(block, ['cal:locationRoom', 'ev:locationroom', 'locationRoom']);
  const location = [locationName, locationRoom].filter(Boolean).join(' · ');
  const organizer =
    extractTagValue(block, ['cal:organizer', 'ev:organizer', 'author']) ??
    extractLabeledValue(descriptionText, ['Organizer', 'Host']);
  const link = extractTagValue(block, ['link']);
  const guid = extractTagValue(block, ['cal:guid', 'guid']) ?? link;
  const startValue =
    extractTagValue(block, ['cal:start', 'ev:startdate', 'startdate', 'event:startdate']) ??
    extractLabeledValue(descriptionText, ['When', 'Start', 'Date']);
  const endValue =
    extractTagValue(block, ['cal:end', 'ev:enddate', 'enddate', 'event:enddate']) ??
    extractLabeledValue(descriptionText, ['End']);
  const startAt = parseDateValue(startValue);
  const endAt = parseDateValue(endValue);
  const explicitTimeLabel =
    extractTagValue(block, ['cal:time', 'ev:time', 'time']) ??
    extractLabeledValue(descriptionText, ['Time']);
  const imageUrl =
    extractTagValue(block, ['cal:image', 'media:content', 'media:thumbnail']) ??
    extractFirstImageUrl(descriptionHtml);
  const statusText = [
    extractTagValue(block, ['cal:status', 'ev:status', 'status']),
    title,
    descriptionText,
  ]
    .filter(Boolean)
    .join(' ');
  const isCancelled = /\bcancel(?:ed|led|lation)?\b/i.test(statusText);
  const category = inferCategory([title, descriptionText, location, organizer, ...categories]);
  const tags = uniqueEventTags([
    ...categories,
    category,
    organizer,
    location,
    ...deriveKeywordTags(title, descriptionText),
  ]);

  if (!startAt) {
    return null;
  }

  const hasStructuredTime = valueIncludesExplicitTime(startValue) || valueIncludesExplicitTime(endValue);
  const timeLabel = explicitTimeLabel
    ? formatEventTimeLabel(explicitTimeLabel)
    : hasStructuredTime
      ? formatRangeLabel(startAt, endAt)
      : 'Time TBA';
  const externalId =
    guid ??
    crypto
      .createHash('sha1')
      .update([title, startAt.toISOString(), location].join('|'))
      .digest('hex');
  const itemHash = crypto
    .createHash('sha1')
    .update([title, descriptionText, startAt.toISOString(), endAt?.toISOString() ?? '', location].join('|'))
    .digest('hex');

  return {
    externalSource: EVENT_FEED_SOURCE_KEY,
    externalId,
    externalUrl: link,
    importHash: itemHash,
    title,
    description: descriptionText || title,
    imageUrl,
    date: startAt,
    endDate: endAt,
    time: timeLabel,
    location: location || '',
    tags,
    category,
    organizer: organizer || '',
    isCancelled,
    isPublished: true,
  };
}

function parseFeed(xml) {
  return extractBlocks(xml)
    .map((block) => buildFeedEventFromBlock(block))
    .filter(Boolean);
}

function prismaModelHasField(modelName, fieldName) {
  const model = prisma._runtimeDataModel?.models?.[modelName];
  return Boolean(model?.fields?.some((field) => field.name === fieldName));
}

function supportsExtendedEventSync() {
  return Boolean(prisma._runtimeDataModel?.models?.EventFeedSync)
    && prismaModelHasField('Event', 'externalSource')
    && prismaModelHasField('Event', 'externalId')
    && prismaModelHasField('Event', 'externalUrl')
    && prismaModelHasField('Event', 'importHash')
    && prismaModelHasField('Event', 'tags');
}

function buildLegacyFeedEventKey(event) {
  return `${buildEventMatchKey(event)}:${slugifyEventToken(event.location ?? '')}`;
}

function buildLegacyFeedEventFallbackKey(event) {
  return `${slugifyEventToken(event.title)}:${slugifyEventToken(event.location ?? '')}`;
}

async function fetchCampusEventsFeed() {
  const response = await fetch(MURRAY_STATE_EVENTS_FEED_URL, {
    cache: 'no-store',
    headers: {
      Accept: 'application/rss+xml, application/xml, text/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Feed request failed with status ${response.status}`);
  }

  const xml = await response.text();
  const parsedEvents = parseFeed(xml);
  if (parsedEvents.length === 0) {
    throw new Error('The feed responded, but no event items could be parsed.');
  }

  return {
    parsedEvents,
    checksum: crypto.createHash('sha256').update(xml).digest('hex'),
  };
}

async function syncCampusEventsFeedLegacy(feedUniversityId) {
  const now = new Date();

  try {
    const { parsedEvents, checksum } = await fetchCampusEventsFeed();

    await prisma.$transaction(async (tx) => {
      const existingFeedEvents = await tx.event.findMany({
        where: {
          universityId: feedUniversityId,
          organizer: LEGACY_FEED_ORGANIZER,
          organizerId: null,
        },
        select: {
          id: true,
          title: true,
          date: true,
          time: true,
          location: true,
        },
      });

      const existingByKey = new Map(
        existingFeedEvents.map((event) => [buildLegacyFeedEventKey(event), event]),
      );
      const existingByFallbackKey = new Map();
      existingFeedEvents.forEach((event) => {
        const fallbackKey = buildLegacyFeedEventFallbackKey(event);
        const matches = existingByFallbackKey.get(fallbackKey) ?? [];
        matches.push(event);
        existingByFallbackKey.set(fallbackKey, matches);
      });
      const seenEventIds = new Set();

      for (const event of parsedEvents) {
        const eventKey = buildLegacyFeedEventKey(event);
        const fallbackMatches = existingByFallbackKey.get(buildLegacyFeedEventFallbackKey(event)) ?? [];
        const existingEvent =
          existingByKey.get(eventKey) ??
          (fallbackMatches.length === 1 ? fallbackMatches[0] : null);

        const legacyEventData = {
          universityId: feedUniversityId,
          title: event.title,
          description: event.description,
          imageUrl: event.imageUrl,
          date: event.date,
          endDate: event.endDate,
          time: event.time,
          location: event.location,
          category: event.category,
          organizer: LEGACY_FEED_ORGANIZER,
          organizerId: null,
          maxAttendees: null,
          isPublished: true,
          isCancelled: event.isCancelled,
        };

        if (existingEvent) {
          seenEventIds.add(existingEvent.id);
          await tx.event.updateMany({
            where: { id: existingEvent.id },
            data: legacyEventData,
          });
          continue;
        }

        await tx.event.createMany({
          data: [legacyEventData],
        });
      }

      const removedEventIds = existingFeedEvents
        .filter((event) => !seenEventIds.has(event.id))
        .map((event) => event.id);

      if (removedEventIds.length > 0) {
        await tx.event.updateMany({
          where: {
            id: { in: removedEventIds },
          },
          data: {
            isPublished: false,
            isCancelled: false,
          },
        });
      }
    });

    return {
      synced: true,
      skipped: false,
      importedCount: parsedEvents.length,
      lastSucceededAt: now,
      checksum,
      legacy: true,
    };
  } catch (error) {
    return {
      synced: false,
      skipped: false,
      lastSucceededAt: null,
      lastError: error instanceof Error ? error.message : 'Unknown feed sync failure',
      legacy: true,
    };
  }
}

async function resolveFeedUniversityId(preferredUniversityId) {
  if (preferredUniversityId) {
    return preferredUniversityId;
  }

  const murrayState = await prisma.university.findFirst({
    where: {
      OR: [
        { name: { contains: 'Murray State', mode: 'insensitive' } },
        { slug: { contains: 'murray', mode: 'insensitive' } },
        { domain: { contains: 'murraystate.edu', mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });

  if (murrayState?.id) {
    return murrayState.id;
  }

  const fallback = await prisma.university.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  return fallback?.id ?? null;
}

async function upsertFeedState(update) {
  return prisma.eventFeedSync.upsert({
    where: { key: EVENT_FEED_SOURCE_KEY },
    create: {
      key: EVENT_FEED_SOURCE_KEY,
      sourceUrl: MURRAY_STATE_EVENTS_FEED_URL,
      ...update,
    },
    update,
  });
}

export async function ensureCampusEventsFeedFresh(options = {}) {
  const feedUniversityId = await resolveFeedUniversityId(options.universityId ?? null);
  if (!feedUniversityId) {
    return {
      synced: false,
      skipped: true,
      reason: 'No university record is available for feed ingestion.',
      lastSucceededAt: null,
    };
  }

  if (!supportsExtendedEventSync()) {
    return syncCampusEventsFeedLegacy(feedUniversityId);
  }

  let currentState = null;
  try {
    currentState = await prisma.eventFeedSync.findUnique({
      where: { key: EVENT_FEED_SOURCE_KEY },
    });
  } catch (error) {
    if (isPrismaSchemaCompatibilityError(error)) {
      return syncCampusEventsFeedLegacy(feedUniversityId);
    }
    throw error;
  }

  const now = new Date();
  const isFresh =
    !options.force &&
    currentState?.lastSucceededAt &&
    now.getTime() - currentState.lastSucceededAt.getTime() < EVENT_FEED_SYNC_INTERVAL_MS;

  if (isFresh) {
    return {
      synced: false,
      skipped: true,
      lastSucceededAt: currentState.lastSucceededAt,
      lastError: currentState.lastError,
    };
  }

  try {
    await upsertFeedState({
      sourceUrl: MURRAY_STATE_EVENTS_FEED_URL,
      lastAttemptedAt: now,
      lastError: null,
    });
  } catch (error) {
    if (isPrismaSchemaCompatibilityError(error)) {
      return syncCampusEventsFeedLegacy(feedUniversityId);
    }
    throw error;
  }

  try {
    const { parsedEvents, checksum } = await fetchCampusEventsFeed();
    const seenExternalIds = parsedEvents.map((event) => event.externalId);

    await prisma.$transaction(async (tx) => {
      for (const event of parsedEvents) {
        await tx.event.upsert({
          where: {
            externalSource_externalId: {
              externalSource: EVENT_FEED_SOURCE_KEY,
              externalId: event.externalId,
            },
          },
          create: {
            ...event,
            universityId: feedUniversityId,
          },
          update: {
            title: event.title,
            description: event.description,
            imageUrl: event.imageUrl,
            date: event.date,
            endDate: event.endDate,
            time: event.time,
            location: event.location,
            tags: event.tags,
            category: event.category,
            organizer: event.organizer,
            externalUrl: event.externalUrl,
            importHash: event.importHash,
            isPublished: true,
            isCancelled: event.isCancelled,
          },
        });
      }

      await tx.event.updateMany({
        where: {
          universityId: feedUniversityId,
          externalSource: EVENT_FEED_SOURCE_KEY,
          externalId: {
            notIn: seenExternalIds,
          },
        },
        data: {
          isPublished: false,
        },
      });

      await tx.eventFeedSync.upsert({
        where: { key: EVENT_FEED_SOURCE_KEY },
        create: {
          key: EVENT_FEED_SOURCE_KEY,
          sourceUrl: MURRAY_STATE_EVENTS_FEED_URL,
          lastAttemptedAt: now,
          lastSucceededAt: now,
          lastError: null,
          lastChecksum: checksum,
        },
        update: {
          sourceUrl: MURRAY_STATE_EVENTS_FEED_URL,
          lastAttemptedAt: now,
          lastSucceededAt: now,
          lastError: null,
          lastChecksum: checksum,
        },
      });
    });

    return {
      synced: true,
      skipped: false,
      importedCount: parsedEvents.length,
      lastSucceededAt: now,
      checksum,
    };
  } catch (error) {
    if (isPrismaSchemaCompatibilityError(error)) {
      return syncCampusEventsFeedLegacy(feedUniversityId);
    }
    const message = error instanceof Error ? error.message : 'Unknown feed sync failure';
    await upsertFeedState({
      sourceUrl: MURRAY_STATE_EVENTS_FEED_URL,
      lastAttemptedAt: now,
      lastError: message,
    });

    return {
      synced: false,
      skipped: false,
      lastSucceededAt: currentState?.lastSucceededAt ?? null,
      lastError: message,
    };
  }
}

export function serializeEventForViewer(event) {
  const { start, end, allDay } = resolveEventDateRange(event);
  const exportedProviders = uniqueEventTags(
    event.calendarExports?.map((record) => record.provider) ?? [],
    12,
  );
  const calendarEntry = event.calendarEntries?.[0] ?? null;

  const sourceType = detectEventSourceType(event);

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    imageUrl: event.imageUrl,
    date: start.toISOString(),
    endDate: end.toISOString(),
    time: event.time,
    allDay,
    timeTba: isTimeTbaLabel(event.time),
    location: event.location ?? null,
    category: event.category,
    organizer: event.organizer ?? null,
    maxAttendees: event.maxAttendees,
    isCancelled: event.isCancelled,
    isPublished: event.isPublished,
    interestedCount: event._count?.interests ?? 0,
    isInterested: Boolean(event.interests?.length),
    isInCalendar: Boolean(calendarEntry),
    calendarEntryId: calendarEntry?.id ?? null,
    exportedProviders,
    externalUrl: event.externalUrl ?? null,
    sourceType,
    syncSource: event.externalSource ?? null,
  };
}

function createDigest(items) {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
  const todayKey = now.toISOString().slice(0, 10);

  return {
    todayCount: items.filter((item) => item.date.slice(0, 10) === todayKey).length,
    nextSevenDaysCount: items.filter((item) => item.date <= nextWeek.toISOString()).length,
    savedCount: items.filter((item) => item.isInterested).length,
    inCalendarCount: items.filter((item) => item.isInCalendar).length,
  };
}

function buildFallbackClusterLabel(category) {
  if (category === 'CAREER') return ['Career Momentum', 'Fairs, panels, and recruiting windows worth planning around.'];
  if (category === 'ACADEMIC') return ['Study & Ideas', 'Talks, lectures, and workshop-style events coming up soon.'];
  if (category === 'ARTS') return ['Arts & Performances', 'Concerts, exhibits, and creative nights on campus.'];
  if (category === 'WELLNESS') return ['Reset & Recharge', 'Wellness-focused events when you need a different pace.'];
  if (category === 'SPORTS') return ['Game Day Energy', 'Athletics and competitive events pulling campus attention.'];
  if (category === 'CLUBS') return ['Clubhouse Picks', 'Student organization events with room to meet people.'];
  return ['Campus Pulse', 'A mix of campus events that are drawing attention right now.'];
}

function buildFallbackSmartCategories(events) {
  const grouped = new Map();
  events.forEach((event) => {
    const bucket = grouped.get(event.category) ?? [];
    bucket.push(event);
    grouped.set(event.category, bucket);
  });

  return [...grouped.entries()]
    .sort((left, right) => right[1].length - left[1].length)
    .slice(0, 4)
    .map(([category, group]) => {
      const [label, description] = buildFallbackClusterLabel(category);
      return {
        id: slugifyEventToken(label),
        label,
        description,
        eventIds: group.slice(0, 6).map((event) => event.id),
      };
    });
}

async function generateSmartCategoriesWithAi(events) {
  if (!process.env.GROQ_API_KEY || events.length === 0) {
    return null;
  }

  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  const prompt = events
    .slice(0, 24)
    .map((event) => {
      const eventLine = [
        `id=${event.id}`,
        `title=${event.title}`,
        `category=${event.category}`,
        `date=${event.date}`,
        `time=${event.time}`,
        `location=${event.location}`,
        `source=${event.sourceLabel ?? event.sourceType ?? 'unknown'}`,
      ];
      return eventLine.join(' | ');
    })
    .join('\n');

  try {
    const { object } = await generateObject({
      model: groq('llama-3.1-8b-instant'),
      schema: EVENT_CLUSTER_SCHEMA,
      temperature: 0.3,
      prompt: `Create up to four concise, student-friendly smart categories for the campus events below.

Rules:
- Focus on the next two to three weeks.
- Use labels that feel useful to a student scanning campus life, not raw admin categories.
- Keep categories distinct and non-overlapping when possible.
- Only reference event IDs that exist in the list.

Events:
${prompt}`,
    });

    return object.clusters.map((cluster) => ({
      id: slugifyEventToken(cluster.label),
      label: cluster.label,
      description: cluster.description,
      eventIds: cluster.eventIds,
    }));
  } catch {
    return null;
  }
}

export async function buildEventCatalogMeta(items) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 21);
  const windowedEvents = items.filter((item) => new Date(item.date) <= horizon);
  const smartCategories =
    (await generateSmartCategoriesWithAi(windowedEvents)) ?? buildFallbackSmartCategories(windowedEvents);

  return {
    digest: createDigest(items),
    smartCategories,
  };
}

function calculateCalendarConflictScore(event, calendarEvents) {
  const eventRange = resolveEventDateRange(event);

  return calendarEvents.some((calendarEvent) => {
    const calendarStart = new Date(calendarEvent.start);
    const calendarEnd = new Date(calendarEvent.end);
    return eventRange.start < calendarEnd && eventRange.end > calendarStart;
  })
    ? -12
    : 0;
}

function buildFallbackRecommendations({ items, followedClubNames, profile, personalCalendar }) {
  const interestTokens = [
    profile.major,
    profile.department,
    profile.year,
    ...followedClubNames,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  const cards = items
    .filter((event) => !event.isCancelled)
    .map((event) => {
      const haystack = [event.title, event.description, event.location, event.organizer, event.activityLabel, event.sourceLabel]
        .join(' ')
        .toLowerCase();

      let fitScore = 48;
      interestTokens.forEach((token) => {
        if (haystack.includes(token)) {
          fitScore += 12;
        }
      });

      if (event.isInterested) fitScore += 10;
      if (!event.isInCalendar) fitScore += 6;
      if (event.category === 'CAREER' && profile.major) fitScore += 8;
      if (event.category === 'CLUBS' && followedClubNames.length > 0) fitScore += 10;
      fitScore += calculateCalendarConflictScore(event, personalCalendar);

      const reason =
        followedClubNames.length > 0 && event.category === 'CLUBS'
          ? 'It lines up with the clubs and communities you already follow.'
          : event.category === 'CAREER'
            ? 'It fits your academic path and could be worth planning around.'
            : event.category === 'WELLNESS'
              ? 'It offers a lighter break around the rest of your schedule.'
              : 'It fits your campus rhythm and has room on your calendar.';

      return {
        eventId: event.id,
        fitScore: Math.max(1, Math.min(99, fitScore)),
        hook: event.category === 'CAREER' ? 'Worth planning around' : 'Good fit this week',
        reason,
      };
    })
    .sort((left, right) => right.fitScore - left.fitScore)
    .slice(0, 8);

  return {
    overview:
      cards.length > 0
        ? 'These picks balance your interests with what still fits around your calendar.'
        : 'No strong matches yet, but new events should surface after the next sync.',
    cards,
  };
}

async function generateRecommendationsWithAi({ items, followedClubNames, profile, personalCalendar }) {
  if (!process.env.GROQ_API_KEY || items.length === 0) {
    return null;
  }

  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  const eventLines = items
    .slice(0, 20)
    .map((event) => {
      const pieces = [
        `id=${event.id}`,
        `title=${event.title}`,
        `category=${event.category}`,
        `date=${event.date}`,
        `time=${event.time}`,
        `location=${event.location}`,
        `isInCalendar=${event.isInCalendar}`,
        `isInterested=${event.isInterested}`,
        `source=${event.sourceLabel ?? event.sourceType ?? 'unknown'}`,
      ];
      return pieces.join(' | ');
    })
    .join('\n');

  const calendarLines = personalCalendar
    .slice(0, 12)
    .map((entry) => `${entry.title} | ${new Date(entry.start).toISOString()} -> ${new Date(entry.end).toISOString()}`)
    .join('\n');

  try {
    const { object } = await generateObject({
      model: groq('llama-3.1-8b-instant'),
      schema: EVENT_RECOMMENDATION_SCHEMA,
      temperature: 0.35,
      prompt: `Recommend campus events for this student.

Student profile:
- major: ${profile.major ?? 'Unknown'}
- department: ${profile.department ?? 'Unknown'}
- year: ${profile.year ?? 'Unknown'}
- followed clubs: ${followedClubNames.join(', ') || 'None'}

Existing calendar:
${calendarLines || 'No upcoming personal calendar items'}

Candidate events:
${eventLines}

Rules:
- Prefer events that fit the student's interests and schedule.
- Avoid overloading the same day when the calendar is already busy.
- Keep hooks punchy and reasons specific.
- Only reference event IDs from the list.
- Use a fitScore from 1 to 100.`,
    });

    return object;
  } catch {
    return null;
  }
}

export async function buildEventRecommendations(options) {
  const { userId, profile, items, horizonDays = 21 } = options;
  const followedClubIds = options.followedClubIds ?? [];
  const horizon = new Date(Date.now() + 1000 * 60 * 60 * 24 * horizonDays);
  const windowedItems = items.filter((item) => new Date(item.date) <= horizon);

  const [followedClubs, personalCalendar] = await Promise.all([
    followedClubIds.length > 0
      ? prisma.clubOrganization.findMany({
          where: { id: { in: followedClubIds } },
          select: { name: true, category: true },
        })
      : Promise.resolve([]),
    prisma.calendarEvent.findMany({
      where: {
        userId,
        end: { gte: new Date() },
        start: { lte: horizon },
      },
      select: {
        id: true,
        title: true,
        start: true,
        end: true,
      },
      orderBy: { start: 'asc' },
      take: 20,
    }),
  ]);

  const followedClubNames = uniqueEventTags(
    followedClubs.flatMap((club) => [club.name, club.category]).filter(Boolean),
    10,
  );
  const fallback = buildFallbackRecommendations({
    items: windowedItems,
    followedClubNames,
    profile,
    personalCalendar,
  });
  const aiResult =
    (await generateRecommendationsWithAi({
      items: windowedItems,
      followedClubNames,
      profile,
      personalCalendar,
    })) ?? fallback;

  const eventById = new Map(windowedItems.map((item) => [item.id, item]));
  const cards = aiResult.cards
    .map((card) => {
      const event = eventById.get(card.eventId);
      if (!event) {
        return null;
      }

      return {
        ...card,
        event,
      };
    })
    .filter(Boolean);

  if (cards.length === 0) {
    return {
      overview: fallback.overview,
      cards: fallback.cards
        .map((card) => ({
          ...card,
          event: eventById.get(card.eventId),
        }))
        .filter((card) => card.event),
      providers: EXTERNAL_CALENDAR_PROVIDERS,
    };
  }

  return {
    overview: aiResult.overview,
    cards,
    providers: EXTERNAL_CALENDAR_PROVIDERS,
  };
}
