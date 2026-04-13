import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit';
import { prisma } from '@/lib/prisma';
import { ApiError, handleApiError, successResponse } from '@/lib/api/utils';
import { createRoleHintToken, setRoleHintCookie } from '@/lib/auth/roleHint';
import { getHomeForRole } from '@/lib/auth/routing';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { facultySetPasswordSchema } from '@/lib/validations/auth';
export const runtime = 'nodejs';
export async function POST(request) {
    try {
        const rateLimit = assertRateLimit({
            key: 'auth:faculty-set-password',
            limit: 5,
            windowMs: 10 * 60_000,
            request,
            message: 'Too many faculty password setup attempts. Please wait before trying again.',
        });
        const payload = facultySetPasswordSchema.parse(await request.json());
        const supabase = await createSupabaseRouteHandlerClient();
        const { data: currentUser, error: getUserError } = await supabase.auth.getUser();
        if (getUserError || !currentUser.user) {
            throw new ApiError(401, 'Your verification session has expired. Request a new one-time passcode.');
        }
        const normalizedEmail = currentUser.user.email?.toLowerCase();
        const facultyUser = await prisma.user.findFirst({
            where: normalizedEmail
                ? {
                    role: 'FACULTY',
                    OR: [{ supabaseId: currentUser.user.id }, { email: normalizedEmail }],
                }
                : {
                    role: 'FACULTY',
                    supabaseId: currentUser.user.id,
                },
            select: { id: true },
        });
        if (!facultyUser) {
            throw new ApiError(403, 'Faculty account access is required to set a faculty password');
        }
        const { error: updateError } = await supabase.auth.updateUser({
            password: payload.password,
        });
        if (updateError) {
            throw new ApiError(400, updateError.message || 'Unable to set password for this account');
        }
        const profile = await prisma.user.update({
            where: { id: facultyUser.id },
            data: {
                supabaseId: currentUser.user.id,
                emailVerified: true,
                lastLogin: new Date(),
            },
            select: {
                id: true,
                universityId: true,
                email: true,
                displayName: true,
                firstName: true,
                lastName: true,
                avatar: true,
                role: true,
                emailVerified: true,
                onboardingComplete: true,
                canPublishCampusAnnouncements: true,
                adminAccessLevel: true,
                portalPermissions: true,
            },
        });
        const response = successResponse({
            profile,
            needsOnboarding: !profile.onboardingComplete,
            destination: getHomeForRole(profile),
        });
        const roleHintToken = await createRoleHintToken(currentUser.user.id, profile.role);
        setRoleHintCookie(response, roleHintToken);
        return withRateLimitHeaders(response, rateLimit);
    }
    catch (error) {
        return handleApiError(error);
    }
}
