import { prisma } from '@/lib/prisma';
import {
  buildEventCatalogMeta,
  enrichEventsForAudience,
  serializeEventForViewer,
} from '@/lib/server/campusEvents';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import { eventQuerySchema } from '@/lib/validations';

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export async function getEventsCatalogData(profile, options = {}) {
  const requestedUniversityId = options.requestedUniversityId ?? undefined;
  const universityId =
    profile.role === 'ADMIN' && requestedUniversityId ? requestedUniversityId : profile.universityId ?? undefined;
  const includeMeta = options.includeMeta === true;
  const includeCancelled = options.includeCancelled === true;
  const payload = eventQuerySchema.parse({
    category: options.category ?? undefined,
    search: options.search ?? undefined,
    upcoming: options.upcoming,
    page: options.page ?? 1,
    limit: options.limit ?? 20,
  });

  const today = startOfToday();
  const where = {
    ...(universityId ? { universityId } : {}),
    ...(payload.category ? { category: payload.category } : {}),
    ...(payload.search
      ? {
          OR: [
            { title: { contains: payload.search, mode: 'insensitive' } },
            { description: { contains: payload.search, mode: 'insensitive' } },
            { location: { contains: payload.search, mode: 'insensitive' } },
            { organizer: { contains: payload.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(payload.upcoming ? { date: { gte: today } } : {}),
    ...(includeCancelled ? {} : { isCancelled: false }),
    isPublished: true,
  };

  let events;
  let total;
  let feedState = null;
  let clubs = [];

  try {
    [events, total, feedState, clubs] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          _count: { select: { interests: true } },
          interests: {
            where: { userId: profile.id },
            select: { id: true },
          },
          calendarEntries: {
            where: { userId: profile.id },
            select: { id: true, campusEventId: true },
            take: 1,
          },
          calendarExports: {
            where: { userId: profile.id },
            select: { provider: true },
          },
        },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        skip: (payload.page - 1) * payload.limit,
        take: payload.limit,
      }),
      prisma.event.count({ where }),
      prisma.eventFeedSync.findUnique({
        where: { key: 'murray-state-main-rss' },
      }),
      prisma.clubOrganization.findMany({
        where: universityId ? { universityId } : {},
        select: {
          id: true,
          name: true,
          category: true,
        },
      }),
    ]);
  } catch (error) {
    if (!isPrismaSchemaCompatibilityError(error)) {
      throw error;
    }

    [events, total, clubs] = await Promise.all([
      prisma.event.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          date: true,
          endDate: true,
          time: true,
          location: true,
          category: true,
          organizer: true,
          maxAttendees: true,
          isPublished: true,
          isCancelled: true,
          _count: { select: { interests: true } },
          interests: {
            where: { userId: profile.id },
            select: { id: true },
          },
        },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        skip: (payload.page - 1) * payload.limit,
        take: payload.limit,
      }),
      prisma.event.count({ where }),
      prisma.clubOrganization.findMany({
        where: universityId ? { universityId } : {},
        select: {
          id: true,
          name: true,
          category: true,
        },
      }),
    ]);
  }

  const followedClubIds = Array.isArray(profile.notificationPreferences?.clubInterestIds)
    ? profile.notificationPreferences.clubInterestIds
    : (
        await prisma.notificationPreferences.findUnique({
          where: { userId: profile.id },
          select: { clubInterestIds: true },
        })
      )?.clubInterestIds ?? [];

  const items = enrichEventsForAudience(
    events.map((event) => serializeEventForViewer(event)),
    {
      clubs,
      followedClubIds,
    },
  );

  const meta = includeMeta
    ? {
        ...(await buildEventCatalogMeta(items)),
        sync: {
          source: 'murray-state-main-rss',
          refreshed: false,
          skipped: true,
          lastSucceededAt: feedState?.lastSucceededAt ?? null,
          lastError: feedState?.lastError ?? null,
        },
      }
    : undefined;

  return {
    items,
    page: payload.page,
    limit: payload.limit,
    total,
    hasMore: payload.page * payload.limit < total,
    meta,
  };
}
