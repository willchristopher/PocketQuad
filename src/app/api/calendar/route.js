import { prisma } from '@/lib/prisma';
import { createCalendarEventSchema } from '@/lib/validations';
import { ApiError, getAuthenticatedUser, handleApiError, successResponse, } from '@/lib/api/utils';

/**
 * GET /api/calendar - Unified calendar view
 * Returns personal calendar events, deadlines, and campus events within date range
 * Query params:
 *   - start: ISO date (required)
 *   - end: ISO date (required)
 *   - includeDeadlines: boolean (default: true)
 *   - includeCampusEvents: boolean (default: true)
 */
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

        // Fetch personal calendar events
        const personalEvents = await prisma.calendarEvent.findMany({
            where: {
                userId: profile.id,
                start: {
                    gte: startDate,
                },
                end: {
                    lte: endDate,
                },
            },
        });

        // Fetch personal deadlines
        let deadlines = [];
        if (includeDeadlines) {
            deadlines = await prisma.deadline.findMany({
                where: {
                    userId: profile.id,
                    dueDate: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
            });
        }

        // Fetch campus events that user is interested in
        let campusEvents = [];
        if (includeCampusEvents) {
            campusEvents = await prisma.event.findMany({
                where: {
                    universityId: profile.universityId || undefined,
                    date: {
                        gte: startDate,
                    },
                    endDate: {
                        lte: endDate,
                    },
                    isPublished: true,
                    isCancelled: false,
                    interests: {
                        some: {
                            userId: profile.id,
                        },
                    },
                },
                include: {
                    _count: { select: { interests: true } },
                },
            });
        }

        // Transform to unified format
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
            ...campusEvents.map((event) => ({
                id: event.id,
                title: event.title,
                description: event.description,
                start: new Date(event.date),
                end: event.endDate ? new Date(event.endDate) : new Date(event.date),
                allDay: false,
                eventType: 'CAMPUS_EVENT',
                type: event.category,
                location: event.location,
                organizer: event.organizer,
                maxAttendees: event.maxAttendees,
                interestedCount: event._count?.interests || 0,
                source: 'event',
            })),
        ];

        // Sort by start date
        unified.sort((a, b) => a.start.getTime() - b.start.getTime());

        return successResponse(unified);
    }
    catch (error) {
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
        const existing = await prisma.calendarEvent.findFirst({
            where: {
                userId: profile.id,
                title: payload.title,
                start: payload.start,
                end: payload.end,
                type: payload.type,
            },
            select: {
                id: true,
            },
        });
        if (existing) {
            throw new ApiError(409, 'This event is already in your calendar');
        }
        const event = await prisma.calendarEvent.create({
            data: {
                userId: profile.id,
                title: payload.title,
                description: payload.description,
                start: payload.start,
                end: payload.end,
                allDay: payload.allDay,
                type: payload.type,
                location: payload.location,
            },
        });
        return successResponse(event, 201);
    }
    catch (error) {
        return handleApiError(error);
    }
}
