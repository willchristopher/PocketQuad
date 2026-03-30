import { prisma } from '@/lib/prisma';
import { ApiError, getAuthenticatedUser, handleApiError, resolveParams, successResponse, } from '@/lib/api/utils';

export async function DELETE(_request, context) {
    try {
        const { profile } = await getAuthenticatedUser();
        const { id } = await resolveParams(context);
        const notification = await prisma.notification.findUnique({
            where: { id },
            select: { id: true, userId: true, clearedAt: true },
        });
        if (!notification || notification.userId !== profile.id || notification.clearedAt) {
            throw new ApiError(404, 'Notification not found');
        }
        const updated = await prisma.notification.update({
            where: { id },
            data: {
                clearedAt: new Date(),
                read: true,
            },
        });
        return successResponse(updated);
    }
    catch (error) {
        return handleApiError(error);
    }
}
