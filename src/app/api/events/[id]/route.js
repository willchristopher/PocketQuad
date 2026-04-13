import { prisma } from '@/lib/prisma';
import { serializeEventForViewer } from '@/lib/server/campusEvents';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
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
      });
    }

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    return successResponse(serializeEventForViewer(event));
  } catch (error) {
    return handleApiError(error);
  }
}
