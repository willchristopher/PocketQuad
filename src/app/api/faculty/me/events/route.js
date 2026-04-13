import { prisma } from '@/lib/prisma';
import { createFacultyOwnedEvent, getFacultyEventOwner } from '@/lib/server/facultyEvents';
import { createEventSchema } from '@/lib/validations';
import { ApiError, getAuthenticatedUser, handleApiError, successResponse, } from '@/lib/api/utils';
const facultyManagedEventSelect = {
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
    building: {
        select: {
            id: true,
            name: true,
            address: true,
            type: true,
        },
    },
};
export async function GET() {
    try {
        const { profile } = await getAuthenticatedUser({
            includeManagedBuildings: true,
        });
        if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
            throw new ApiError(403, 'Faculty access required');
        }
        await getFacultyEventOwner(profile.id);
        const events = await prisma.event.findMany({
            where: {
                organizerId: profile.id,
            },
            select: facultyManagedEventSelect,
            orderBy: [{ date: 'asc' }, { createdAt: 'desc' }],
            take: 100,
        });
        return successResponse(events);
    }
    catch (error) {
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
        const result = await createFacultyOwnedEvent({
            profile,
            payload,
        });
        return successResponse({
            ...result.event,
            notifiedCount: result.notifiedCount,
        }, 201);
    }
    catch (error) {
        return handleApiError(error);
    }
}
