import { prisma } from '@/lib/prisma';
import { ApiError, getAuthenticatedAdmin, handleApiError, resolveParams, successResponse } from '@/lib/api/utils';

function isOwnerAccount(profile) {
    return (profile.adminAccessLevel === 'OWNER' ||
        (profile.role === 'ADMIN' && profile.adminAccessLevel == null));
}

export async function DELETE(_request, context) {
    try {
        const { profile } = await getAuthenticatedAdmin('ADMIN_TAB_CHAT');
        const { id } = await resolveParams(context);
        const message = await prisma.chatMessage.findUnique({
            where: { id },
            select: {
                id: true,
                user: {
                    select: {
                        universityId: true,
                    },
                },
            },
        });
        if (!message) {
            throw new ApiError(404, 'Message not found');
        }
        if (!isOwnerAccount(profile) && message.user.universityId !== profile.universityId) {
            throw new ApiError(403, 'You can only delete chat messages for your own university');
        }
        await prisma.chatMessage.delete({
            where: { id },
        });
        return successResponse({ success: true });
    }
    catch (error) {
        return handleApiError(error);
    }
}
