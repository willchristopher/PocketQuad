import { prisma } from '@/lib/prisma';
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import { purgeExpiredEvents } from '@/lib/server/eventMaintenance';
import { adminEventCreateSchema } from '@/lib/validations/admin';
const adminEventSelect = {
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
    audience: true,
    organizer: true,
    organizerId: true,
    maxAttendees: true,
    isPublished: true,
    isCancelled: true,
    createdAt: true,
    updatedAt: true,
    university: {
        select: { id: true, name: true, slug: true },
    },
};
const legacyAdminEventSelect = {
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
    university: {
        select: { id: true, name: true, slug: true },
    },
};
export async function GET(request) {
    try {
        await getAuthenticatedAdmin('ADMIN_TAB_EVENTS');
        const universityId = request.nextUrl.searchParams.get('universityId') ?? undefined;
        await purgeExpiredEvents(universityId);
        let events;
        try {
            events = await prisma.event.findMany({
                where: {
                    ...(universityId ? { universityId } : {}),
                },
                select: adminEventSelect,
                orderBy: [{ date: 'asc' }],
                take: 200,
            });
        }
        catch (error) {
            if (!isPrismaSchemaCompatibilityError(error)) {
                throw error;
            }
            events = (await prisma.event.findMany({
                where: {
                    ...(universityId ? { universityId } : {}),
                },
                select: legacyAdminEventSelect,
                orderBy: [{ date: 'asc' }],
                take: 200,
            })).map((event) => ({
                ...event,
                audience: 'ALL_CAMPUS',
            }));
        }
        return successResponse(events);
    }
    catch (error) {
        return handleApiError(error);
    }
}
export async function POST(request) {
    try {
        await getAuthenticatedAdmin('ADMIN_TAB_EVENTS');
        const payload = adminEventCreateSchema.parse(await request.json());
        const university = await prisma.university.findUnique({
            where: { id: payload.universityId },
            select: { id: true },
        });
        if (!university) {
            throw new ApiError(404, 'University not found');
        }
        let event;
        try {
            event = await prisma.event.create({
                data: {
                    universityId: payload.universityId,
                    title: payload.title,
                    description: payload.description,
                    date: payload.date,
                    time: payload.time,
                    location: payload.location,
                    category: payload.category,
                    audience: payload.audience,
                    organizer: payload.organizer,
                    isPublished: payload.isPublished,
                },
                select: adminEventSelect,
            });
        }
        catch (error) {
            if (!isPrismaSchemaCompatibilityError(error)) {
                throw error;
            }
            event = await prisma.event.create({
                data: {
                    universityId: payload.universityId,
                    title: payload.title,
                    description: payload.description,
                    date: payload.date,
                    time: payload.time,
                    location: payload.location,
                    category: payload.category,
                    organizer: payload.organizer,
                    isPublished: payload.isPublished,
                },
                select: legacyAdminEventSelect,
            });
            event = {
                ...event,
                audience: 'ALL_CAMPUS',
            };
        }
        return successResponse(event, 201);
    }
    catch (error) {
        return handleApiError(error);
    }
}
