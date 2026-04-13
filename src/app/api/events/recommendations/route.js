import { prisma } from '@/lib/prisma';
import {
  buildEventRecommendations,
  enrichEventsForAudience,
  ensureCampusEventsFeedFresh,
  serializeEventForViewer,
} from '@/lib/server/campusEvents';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import {
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils';

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser({
      includePreferences: true,
    });

    await ensureCampusEventsFeedFresh({
      universityId: profile.universityId ?? undefined,
    });

    const horizon = new Date(Date.now() + 1000 * 60 * 60 * 24 * 21);
    let events;
    const clubsPromise = prisma.clubOrganization.findMany({
      where: profile.universityId ? { universityId: profile.universityId } : {},
      select: {
        id: true,
        name: true,
        category: true,
      },
    });
    try {
      events = await prisma.event.findMany({
        where: {
          universityId: profile.universityId || undefined,
          date: {
            gte: new Date(),
            lte: horizon,
          },
          isPublished: true,
          isCancelled: false,
        },
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
        take: 48,
      });
    } catch (error) {
      if (!isPrismaSchemaCompatibilityError(error)) {
        throw error;
      }
      events = await prisma.event.findMany({
        where: {
          universityId: profile.universityId || undefined,
          date: {
            gte: new Date(),
            lte: horizon,
          },
          isPublished: true,
          isCancelled: false,
        },
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
        take: 48,
      });
    }

    const items = events.map((event) => serializeEventForViewer(event));
    const clubs = await clubsPromise;
    const enrichedItems = enrichEventsForAudience(items, {
      clubs,
      followedClubIds: profile.notificationPreferences?.clubInterestIds ?? [],
    });
    const recommendations = await buildEventRecommendations({
      userId: profile.id,
      profile: {
        major: profile.major ?? null,
        department: profile.department ?? null,
        year: profile.year ?? null,
      },
      followedClubIds: profile.notificationPreferences?.clubInterestIds ?? [],
      items: enrichedItems,
    });

    return successResponse(recommendations);
  } catch (error) {
    return handleApiError(error);
  }
}
