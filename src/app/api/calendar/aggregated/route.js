import { prisma } from '@/lib/prisma';
import { resolveEventDateRange } from '@/lib/events';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import { buildEventAudienceVisibilityWhere } from '@/lib/server/eventVisibility';
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
    AND: [
      buildEventAudienceVisibilityWhere({ id: userId }),
      {
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
      },
    ],
  };
}

export async function GET(request) {
  try {
    const { profile } = await getAuthenticatedUser();
    const start = request.nextUrl.searchParams.get('start');
    const end = request.nextUrl.searchParams.get('end');
    const groupBy = request.nextUrl.searchParams.get('groupBy') || 'date';

    if (!start || !end) {
      throw new ApiError(400, 'start and end query params are required');
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new ApiError(400, 'Invalid start or end date');
    }

    let personalEvents;
    let deadlines;
    let campusEvents;
    let eventInterests;
    try {
      [personalEvents, deadlines, campusEvents, eventInterests] = await Promise.all([
        prisma.calendarEvent.findMany({
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
            createdAt: true,
            campusEventId: true,
          },
        }),
        prisma.deadline.findMany({
          where: {
            userId: profile.id,
            dueDate: { gte: startDate, lte: endDate },
          },
          select: {
            id: true,
            title: true,
            notes: true,
            course: true,
            dueDate: true,
            priority: true,
            completed: true,
            createdAt: true,
          },
        }),
        prisma.event.findMany({
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
        }),
        prisma.eventInterest.count({
          where: { userId: profile.id },
        }),
      ]);
    } catch (error) {
      if (!isPrismaSchemaCompatibilityError(error)) {
        throw error;
      }
      [personalEvents, deadlines, campusEvents, eventInterests] = await Promise.all([
        prisma.calendarEvent.findMany({
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
            createdAt: true,
          },
        }),
        prisma.deadline.findMany({
          where: {
            userId: profile.id,
            dueDate: { gte: startDate, lte: endDate },
          },
          select: {
            id: true,
            title: true,
            notes: true,
            course: true,
            dueDate: true,
            priority: true,
            completed: true,
            createdAt: true,
          },
        }),
        prisma.event.findMany({
          where: {
            universityId: profile.universityId || undefined,
            ...buildCampusEventRangeWhere(startDate, endDate),
            isPublished: true,
            isCancelled: false,
            calendarEntries: { some: { userId: profile.id } },
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
        }),
        prisma.eventInterest.count({
          where: { userId: profile.id },
        }),
      ]);
    }
    const linkedCampusEventIds = new Set(
      personalEvents.map((event) => event.campusEventId).filter(Boolean),
    );
    const campusEventById = new Map(campusEvents.map((event) => [event.id, event]));

    const events = [
      ...personalEvents.map((event) => {
        const linkedCampusEvent = event.campusEventId ? campusEventById.get(event.campusEventId) : null;
        const linkedRange = linkedCampusEvent ? resolveEventDateRange(linkedCampusEvent) : null;

        return {
          id: event.id,
          title: linkedCampusEvent?.title ?? event.title,
          description: linkedCampusEvent?.description ?? event.description,
          start: linkedRange?.start ?? event.start,
          end: linkedRange?.end ?? event.end,
          allDay: linkedRange?.allDay ?? event.allDay,
          eventType: linkedCampusEvent ? 'CAMPUS_EVENT' : 'PERSONAL_EVENT',
          type: linkedCampusEvent?.category ?? event.type,
          location: linkedCampusEvent?.location ?? event.location,
          organizer: linkedCampusEvent?.organizer,
          maxAttendees: linkedCampusEvent?.maxAttendees,
          source: 'calendar',
          priority: 'MEDIUM',
          completed: false,
          campusEventId: event.campusEventId ?? null,
        };
      }),
      ...deadlines.map((deadline) => ({
        id: deadline.id,
        title: deadline.title,
        description: deadline.notes,
        start: deadline.dueDate,
        end: deadline.dueDate,
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
          priority: 'MEDIUM',
          completed: false,
          campusEventId: event.id,
        };
      }),
    ];

    const stats = {
      total: events.length,
      byType: {
        personal: personalEvents.length,
        deadline: deadlines.length + campusEvents.filter((event) => event.audience === 'DEADLINE').length,
        campusEvent: campusEvents.filter((event) => event.audience !== 'DEADLINE').length,
      },
      byPriority: {
        HIGH: deadlines.filter((deadline) => deadline.priority === 'HIGH').length,
        MEDIUM:
          deadlines.filter((deadline) => deadline.priority === 'MEDIUM').length +
          campusEvents.filter((event) => event.audience === 'DEADLINE').length,
        LOW: deadlines.filter((deadline) => deadline.priority === 'LOW').length,
      },
      upcomingDeadlines:
        deadlines.filter((deadline) => !deadline.completed).length +
        campusEvents.filter((event) => event.audience === 'DEADLINE').length,
      completedDeadlines: deadlines.filter((deadline) => deadline.completed).length,
      interestedInEvents: eventInterests,
    };

    const sortedEvents = events.sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime());
    let groupedData = sortedEvents;

    if (groupBy === 'type') {
      groupedData = {
        PERSONAL_EVENT: sortedEvents.filter((event) => event.eventType === 'PERSONAL_EVENT'),
        DEADLINE: sortedEvents.filter((event) => event.eventType === 'DEADLINE'),
        CAMPUS_EVENT: sortedEvents.filter((event) => event.eventType === 'CAMPUS_EVENT'),
      };
    } else if (groupBy === 'priority') {
      groupedData = {
        HIGH: sortedEvents.filter((event) => event.priority === 'HIGH'),
        MEDIUM: sortedEvents.filter((event) => event.priority === 'MEDIUM'),
        LOW: sortedEvents.filter((event) => event.priority === 'LOW'),
      };
    }

    return successResponse({
      events: sortedEvents,
      grouped: groupedData,
      stats,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      meta: {
        groupedBy: groupBy,
        requestTimestamp: new Date().toISOString(),
        cacheControl: 'max-age=300',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
