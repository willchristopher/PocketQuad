import { prisma } from '@/lib/prisma';
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils';
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
        const events = await prisma.event.findMany({
            where: {
                ...(universityId ? { universityId } : {}),
            },
            select: adminEventSelect,
            orderBy: [{ date: 'asc' }],
            take: 200,
        });
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
        const event = await prisma.event.create({
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
            select: adminEventSelect,
        });
        return successResponse(event, 201);
    }
    catch (error) {
        return handleApiError(error);
    }
}
