import { prisma } from '@/lib/prisma';
import { resolveEventDateRange } from '@/lib/events';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import { createCalendarEventSchema } from '@/lib/validations';
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils';

function buildCampusEventRangeWhere(startDate, endDate) {
  return {
    OR: [
      {
        AND: [
          { endDate: null },
          { date: { gte: startDate, lte: endDate } },
        ],
      },
      {
        AND: [
          { endDate: { not: null, gte: startDate } },
          { date: { lte: endDate } },
        ],
      },
    ],
  };
}

function buildCampusEventCalendarVisibilityWhere(userId) {
  return {
    OR: [
      { audience: 'DEADLINE' },
      {
        AND: [
          { audience: { not: 'DEADLINE' } },
          {
            calendarEntries: {
              some: {
                userId,
              },
            },
          },
        ],
      },
    ],
  };
}

export async function GET(request) {
  try {
    const { profile } = await getAuthenticatedUser();
    const start = request.nextUrl.searchParams.get('start');
    const end = request.nextUrl.searchParams.get('end');
    const includeDeadlines = request.nextUrl.searchParams.get('includeDeadlines') !== 'false';
    const includeCampusEvents = request.nextUrl.searchParams.get('includeCampusEvents') !== 'false';

    if (!start || !end) {
      throw new ApiError(400, 'start and end query params are required');
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new ApiError(400, 'Invalid start or end date');
    }

    const getPersonalEvents = (includeCampusEventId) => prisma.calendarEvent.findMany({
      where: {
        userId: profile.id,
        start: { lte: endDate },
        end: { gte: startDate },
      },
      select: {
        id: true,
        title: true,
        description: true,
        start: true,
        end: true,
        allDay: true,
        type: true,
        location: true,
        ...(includeCampusEventId ? { campusEventId: true } : {}),
      },
    });

    const deadlinesPromise = includeDeadlines
      ? prisma.deadline.findMany({
          where: {
            userId: profile.id,
            dueDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        })
      : Promise.resolve([]);

    const campusEventsPromise = includeCampusEvents
      ? prisma.event.findMany({
          where: {
            universityId: profile.universityId || undefined,
            ...buildCampusEventRangeWhere(startDate, endDate),
            isPublished: true,
            isCancelled: false,
            ...buildCampusEventCalendarVisibilityWhere(profile.id),
          },
          select: {
            id: true,
            title: true,
            description: true,
            date: true,
            endDate: true,
            time: true,
            category: true,
            audience: true,
            location: true,
            organizer: true,
            maxAttendees: true,
          },
      })
      : Promise.resolve([]);

    let personalEvents;
    let deadlines;
    let campusEvents;
    try {
      [personalEvents, deadlines, campusEvents] = await Promise.all([
        getPersonalEvents(true),
        deadlinesPromise,
        campusEventsPromise,
      ]);
    } catch (error) {
      if (!isPrismaSchemaCompatibilityError(error)) {
        throw error;
      }
      [personalEvents, deadlines, campusEvents] = await Promise.all([
        getPersonalEvents(false),
        deadlinesPromise,
        includeCampusEvents
          ? prisma.event.findMany({
              where: {
                universityId: profile.universityId || undefined,
                ...buildCampusEventRangeWhere(startDate, endDate),
                isPublished: true,
                isCancelled: false,
                calendarEntries: {
                  some: {
                    userId: profile.id,
                  },
                },
              },
              select: {
                id: true,
                title: true,
                description: true,
                date: true,
                endDate: true,
                time: true,
                category: true,
                location: true,
                organizer: true,
                maxAttendees: true,
              },
            })
          : Promise.resolve([]),
      ]);
    }
    const linkedCampusEventIds = new Set(
      personalEvents.map((event) => event.campusEventId).filter(Boolean),
    );

    const unified = [
      ...personalEvents.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        eventType: 'PERSONAL_EVENT',
        type: event.type,
        location: event.location,
        source: 'calendar',
        campusEventId: event.campusEventId ?? null,
      })),
      ...deadlines.map((deadline) => ({
        id: deadline.id,
        title: deadline.title,
        description: deadline.notes,
        start: new Date(deadline.dueDate),
        end: new Date(deadline.dueDate),
        allDay: true,
        eventType: 'DEADLINE',
        type: 'DEADLINE',
        course: deadline.course,
        priority: deadline.priority,
        completed: deadline.completed,
        source: 'deadline',
      })),
      ...campusEvents
        .filter((event) => event.audience === 'DEADLINE' || !linkedCampusEventIds.has(event.id))
        .map((event) => {
        const range = resolveEventDateRange(event);
        if (event.audience === 'DEADLINE') {
          return {
            id: event.id,
            title: event.title,
            description: event.description,
            start: range.start,
            end: range.end,
            allDay: range.allDay,
            eventType: 'DEADLINE',
            type: 'DEADLINE',
            course: event.organizer || event.location || 'Campus deadline',
            location: event.location,
            organizer: event.organizer,
            priority: 'MEDIUM',
            completed: false,
            source: 'event',
            campusEventId: event.id,
            autoAddedToCalendar: true,
          };
        }
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          start: range.start,
          end: range.end,
          allDay: range.allDay,
          eventType: 'CAMPUS_EVENT',
          type: event.category,
          location: event.location,
          organizer: event.organizer,
          maxAttendees: event.maxAttendees,
          interestedCount: linkedCampusEventIds.has(event.id) ? 0 : 1,
          source: 'event',
          campusEventId: event.id,
        };
      }),
    ];

    unified.sort((left, right) => left.start.getTime() - right.start.getTime());
    return successResponse(unified);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const { profile } = await getAuthenticatedUser();
    const payload = createCalendarEventSchema.parse(await request.json());
    if (payload.end < payload.start) {
      throw new ApiError(400, 'Event end must be after start');
    }

    let nextEventData = {
      title: payload.title,
      description: payload.description,
      start: payload.start,
      end: payload.end,
      allDay: payload.allDay,
      type: payload.type,
      campusEventId: payload.campusEventId ?? null,
      location: payload.location,
    };

    if (payload.campusEventId) {
      if (payload.type !== 'CAMPUS') {
        throw new ApiError(400, 'Campus event links can only be created for CAMPUS calendar items.');
      }

      const campusEvent = await prisma.event.findUnique({
        where: { id: payload.campusEventId },
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          endDate: true,
          time: true,
          location: true,
          audience: true,
          isPublished: true,
          isCancelled: true,
        },
      });
      if (!campusEvent || !campusEvent.isPublished || campusEvent.isCancelled) {
        throw new ApiError(404, 'Campus event not found');
      }
      if (campusEvent.audience === 'DEADLINE') {
        throw new ApiError(400, 'Deadline events already appear on every PocketQuad calendar.');
      }

      const range = resolveEventDateRange(campusEvent);
      nextEventData = {
        title: campusEvent.title,
        description: campusEvent.description,
        start: range.start,
        end: range.end,
        allDay: range.allDay,
        type: 'CAMPUS',
        campusEventId: campusEvent.id,
        location: campusEvent.location,
      };
    }

    let existing;
    try {
      existing = await prisma.calendarEvent.findFirst({
        where: {
          userId: profile.id,
          ...(nextEventData.campusEventId
            ? { campusEventId: nextEventData.campusEventId }
            : {
                title: nextEventData.title,
                start: nextEventData.start,
                end: nextEventData.end,
                type: nextEventData.type,
              }),
        },
        select: {
          id: true,
        },
      });
    } catch (error) {
      if (!isPrismaSchemaCompatibilityError(error)) {
        throw error;
      }
      existing = await prisma.calendarEvent.findFirst({
        where: {
          userId: profile.id,
          title: nextEventData.title,
          start: nextEventData.start,
          end: nextEventData.end,
          type: nextEventData.type,
        },
        select: {
          id: true,
        },
      });
      nextEventData = {
        ...nextEventData,
        campusEventId: null,
      };
    }
    if (existing) {
      throw new ApiError(409, 'This event is already in your calendar');
    }

    let event;
    try {
      event = await prisma.calendarEvent.create({
        data: {
          userId: profile.id,
          ...nextEventData,
        },
      });
    } catch (error) {
      if (!isPrismaSchemaCompatibilityError(error)) {
        throw error;
      }
      const { campusEventId, ...legacyEventData } = nextEventData;
      event = await prisma.calendarEvent.create({
        data: {
          userId: profile.id,
          ...legacyEventData,
        },
      });
    }

    return successResponse(event, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
