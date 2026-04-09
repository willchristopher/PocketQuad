import { prisma } from '@/lib/prisma';
import { ApiError, getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils';

/**
 * GET /api/calendar/aggregated - Server-side aggregation endpoint
 * Combines all calendar data into a single optimized response
 * Reduces client fan-out by 3+ requests into 1
 * 
 * Query params:
 *   - start: ISO date (required)
 *   - end: ISO date (required)
 *   - groupBy: 'type' | 'date' | 'priority' (default: 'date')
 */
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

        // Server-side: Fetch all data in parallel (single roundtrip when possible)
        const [personalEvents, deadlines, campusEvents, eventInterests] = await Promise.all([
            prisma.calendarEvent.findMany({
                where: {
                    userId: profile.id,
                    start: { gte: startDate },
                    end: { lte: endDate },
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
                    date: { gte: startDate },
                    endDate: { lte: endDate },
                    isPublished: true,
                    isCancelled: false,
                    interests: { some: { userId: profile.id } },
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    date: true,
                    endDate: true,
                    category: true,
                    location: true,
                    organizer: true,
                    maxAttendees: true,
                    _count: { select: { interests: true } },
                },
            }),
            prisma.eventInterest.count({
                where: { userId: profile.id },
            }),
        ]);

        // Server-side aggregation and transformation
        const events = [
            ...personalEvents.map((e) => ({
                id: e.id,
                title: e.title,
                description: e.description,
                start: e.start,
                end: e.end,
                allDay: e.allDay,
                eventType: 'PERSONAL_EVENT',
                type: e.type,
                location: e.location,
                source: 'calendar',
                priority: 'MEDIUM',
                completed: false,
            })),
            ...deadlines.map((d) => ({
                id: d.id,
                title: d.title,
                description: d.notes,
                start: d.dueDate,
                end: d.dueDate,
                allDay: true,
                eventType: 'DEADLINE',
                type: 'DEADLINE',
                course: d.course,
                priority: d.priority,
                completed: d.completed,
                source: 'deadline',
            })),
            ...campusEvents.map((e) => ({
                id: e.id,
                title: e.title,
                description: e.description,
                start: e.date,
                end: e.endDate || e.date,
                allDay: false,
                eventType: 'CAMPUS_EVENT',
                type: e.category,
                location: e.location,
                organizer: e.organizer,
                maxAttendees: e.maxAttendees,
                interestedCount: e._count?.interests || 0,
                source: 'event',
                priority: 'MEDIUM',
                completed: false,
            })),
        ];

        // Server-side computations
        const stats = {
            total: events.length,
            byType: {
                personal: personalEvents.length,
                deadline: deadlines.length,
                campusEvent: campusEvents.length,
            },
            byPriority: {
                HIGH: deadlines.filter((d) => d.priority === 'HIGH').length,
                MEDIUM: deadlines.filter((d) => d.priority === 'MEDIUM').length,
                LOW: deadlines.filter((d) => d.priority === 'LOW').length,
            },
            upcomingDeadlines: deadlines.filter((d) => !d.completed).length,
            completedDeadlines: deadlines.filter((d) => d.completed).length,
            interestedInEvents: eventInterests,
        };

        // Server-side sorting & grouping
        const sortedEvents = events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        let groupedData = sortedEvents;

        if (groupBy === 'type') {
            groupedData = {
                PERSONAL_EVENT: sortedEvents.filter((e) => e.eventType === 'PERSONAL_EVENT'),
                DEADLINE: sortedEvents.filter((e) => e.eventType === 'DEADLINE'),
                CAMPUS_EVENT: sortedEvents.filter((e) => e.eventType === 'CAMPUS_EVENT'),
            };
        } else if (groupBy === 'priority') {
            groupedData = {
                HIGH: sortedEvents.filter((e) => e.priority === 'HIGH'),
                MEDIUM: sortedEvents.filter((e) => e.priority === 'MEDIUM'),
                LOW: sortedEvents.filter((e) => e.priority === 'LOW'),
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
                cacheControl: 'max-age=300', // Cache for 5 minutes on client
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
