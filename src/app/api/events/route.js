import { canManageBuilding } from '@/lib/facultyPermissions';
import { combineEventDateTime, formatEventTimeLabel } from '@/lib/events';
import { prisma } from '@/lib/prisma';
import { getEventsCatalogData } from '@/lib/server/eventsCatalog';
import { createEventSchema, eventQuerySchema } from '@/lib/validations';
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils';

const eventWriteSelect = {
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
};

export async function GET(request) {
  try {
    const { profile } = await getAuthenticatedUser({
      includePreferences: true,
    });
    const payload = eventQuerySchema.parse({
      category: request.nextUrl.searchParams.get('category') ?? undefined,
      search: request.nextUrl.searchParams.get('search') ?? undefined,
      upcoming:
        request.nextUrl.searchParams.get('upcoming') === null
          ? undefined
          : request.nextUrl.searchParams.get('upcoming') === 'true',
      page: request.nextUrl.searchParams.get('page') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
    });

    return successResponse(
      await getEventsCatalogData(profile, {
        ...payload,
        requestedUniversityId: request.nextUrl.searchParams.get('universityId') ?? undefined,
        includeMeta: request.nextUrl.searchParams.get('includeMeta') === 'true',
        includeCancelled: request.nextUrl.searchParams.get('includeCancelled') === 'true',
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const { profile } = await getAuthenticatedUser({
      includeManagedBuildings: true,
    });
    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required');
    }

    const payload = createEventSchema.parse(await request.json());
    let building = null;
    if (payload.buildingId) {
      if (!canManageBuilding(profile, payload.buildingId)) {
        throw new ApiError(403, 'You do not manage that building');
      }
      building = await prisma.campusBuilding.findFirst({
        where: {
          id: payload.buildingId,
          ...(profile.universityId ? { universityId: profile.universityId } : {}),
        },
        select: {
          id: true,
          name: true,
          address: true,
        },
      });
      if (!building) {
        throw new ApiError(404, 'Building not found');
      }
    }

    const startsAt = combineEventDateTime(payload.date, payload.time);
    if (!startsAt) {
      throw new ApiError(400, 'Unable to parse the event date and time.');
    }

    const nextEventData = {
      universityId: profile.universityId,
      buildingId: building?.id ?? null,
      title: payload.title,
      description: payload.description,
      date: startsAt,
      time: formatEventTimeLabel(payload.time),
      location: payload.location || (building ? `${building.name} · ${building.address}` : payload.location),
      category: payload.category,
      organizer: profile.displayName,
      organizerId: profile.id,
      maxAttendees: payload.maxAttendees,
      tags: [payload.category],
    };

    let event;
    try {
      event = await prisma.event.create({
        data: nextEventData,
        select: eventWriteSelect,
      });
    } catch (error) {
      if (!isPrismaSchemaCompatibilityError(error)) {
        throw error;
      }
      const { tags, ...legacyEventData } = nextEventData;
      event = await prisma.event.create({
        data: legacyEventData,
        select: eventWriteSelect,
      });
    }

    let notifiedCount = 0;
    const faculty = await prisma.faculty.findUnique({
      where: { userId: profile.id },
      select: { id: true },
    });
    if (faculty) {
      const subscribers = await prisma.facultyFavorite.findMany({
        where: {
          facultyId: faculty.id,
          user: {
            role: 'STUDENT',
            notificationPreferences: {
              is: {
                newEvents: true,
              },
            },
          },
        },
        select: {
          userId: true,
        },
      });
      if (subscribers.length > 0) {
        await prisma.notification.createMany({
          data: subscribers.map((subscriber) => ({
            userId: subscriber.userId,
            type: 'NEW_EVENT',
            title: `${profile.displayName} created a new event`,
            message: `${event.title} | ${event.time} | ${event.location}`,
            actionUrl: `/events/${event.id}`,
            actionLabel: 'View event',
          })),
        });
      }
      notifiedCount = subscribers.length;
    }

    return successResponse({ ...event, notifiedCount }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
