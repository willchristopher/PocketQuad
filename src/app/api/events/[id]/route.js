import { prisma } from '@/lib/prisma';
import { attachCalendarInterestCounts, serializeEventForViewer } from '@/lib/server/campusEvents';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import { canViewEventForAudience } from '@/lib/server/eventVisibility';
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  resolveParams,
  successResponse,
} from '@/lib/api/utils';

export async function GET(_request, context) {
  try {
    const { profile } = await getAuthenticatedUser();
    const { id } = await resolveParams(context);
    let event;
    try {
      event = await prisma.event.findUnique({
        where: { id },
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
          audience: true,
          organizer: true,
          organizerId: true,
          maxAttendees: true,
          isPublished: true,
          isCancelled: true,
          organizerRef: {
            select: {
              facultyProfile: {
                select: {
                  favorites: {
                    where: { userId: profile.id },
                    select: { userId: true },
                    take: 1,
                  },
                },
              },
            },
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
      });
    } catch (error) {
      if (!isPrismaSchemaCompatibilityError(error)) {
        throw error;
      }
      event = await prisma.event.findUnique({
        where: { id },
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
          audience: true,
          organizer: true,
          organizerId: true,
          maxAttendees: true,
          isPublished: true,
          isCancelled: true,
          organizerRef: {
            select: {
              facultyProfile: {
                select: {
                  favorites: {
                    where: { userId: profile.id },
                    select: { userId: true },
                    take: 1,
                  },
                },
              },
            },
          },
          calendarEntries: {
            where: { userId: profile.id },
            select: { id: true, campusEventId: true },
            take: 1,
          },
        },
      });
    }

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }
    if (!canViewEventForAudience(profile, event)) {
      throw new ApiError(404, 'Event not found');
    }

    const [eventWithCounts] = await attachCalendarInterestCounts([event]);
    return successResponse(serializeEventForViewer(eventWithCounts));
  } catch (error) {
    return handleApiError(error);
  }
}
