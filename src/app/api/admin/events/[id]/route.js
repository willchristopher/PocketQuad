import { prisma } from '@/lib/prisma';
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import { adminEventUpdateSchema } from '@/lib/validations/admin';
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
export async function PATCH(request, context) {
    try {
        await getAuthenticatedAdmin('ADMIN_TAB_EVENTS');
        const { id } = await context.params;
        const payload = adminEventUpdateSchema.parse(await request.json());
        if (payload.universityId) {
            const university = await prisma.university.findUnique({
                where: { id: payload.universityId },
                select: { id: true },
            });
            if (!university) {
                throw new ApiError(404, 'University not found');
            }
        }
        let updated;
        try {
            updated = await prisma.event.update({
                where: { id },
                data: payload,
                select: adminEventSelect,
            });
        }
        catch (error) {
            if (!isPrismaSchemaCompatibilityError(error)) {
                throw error;
            }
            const { audience, ...legacyPayload } = payload;
            updated = await prisma.event.update({
                where: { id },
                data: legacyPayload,
                select: legacyAdminEventSelect,
            });
            updated = {
                ...updated,
                audience: 'ALL_CAMPUS',
            };
        }
        return successResponse(updated);
    }
    catch (error) {
        return handleApiError(error);
    }
}
export async function DELETE(_request, context) {
    try {
        await getAuthenticatedAdmin('ADMIN_TAB_EVENTS');
        const { id } = await context.params;
        await prisma.event.delete({ where: { id } });
        return successResponse({ deleted: true });
    }
    catch (error) {
        return handleApiError(error);
    }
}
