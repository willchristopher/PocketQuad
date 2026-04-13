import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import { updateProfileSchema } from '@/lib/validations';
export async function GET() {
    try {
        const { profile } = await getAuthenticatedUser({
            includePreferences: true,
            includeUniversity: true,
            includeManagedClubs: true,
        });
        let unreadNotificationCount;
        try {
            unreadNotificationCount = await prisma.notification.count({
                where: {
                    userId: profile.id,
                    read: false,
                    clearedAt: null,
                },
            });
        }
        catch (error) {
            if (!isPrismaSchemaCompatibilityError(error)) {
                throw error;
            }
            unreadNotificationCount = await prisma.notification.count({
                where: {
                    userId: profile.id,
                    read: false,
                },
            });
        }
        return successResponse({
            ...profile,
            unreadNotificationCount,
        });
    }
    catch (error) {
        return handleApiError(error);
    }
}
export async function PATCH(request) {
    try {
        const { profile } = await getAuthenticatedUser();
        const rateLimit = assertRateLimit({
            key: 'users:me:patch',
            limit: 20,
            windowMs: 10 * 60_000,
            request,
            identifier: profile.id,
            message: 'Too many profile update attempts. Please wait a few minutes and try again.',
        });
        const payload = updateProfileSchema.parse(await request.json());
        const updated = await prisma.user.update({
            where: { id: profile.id },
            data: payload,
            include: {
                notificationPreferences: true,
            },
        });
        return withRateLimitHeaders(successResponse(updated), rateLimit);
    }
    catch (error) {
        return handleApiError(error);
    }
}
