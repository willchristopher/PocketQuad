import { prisma } from '@/lib/prisma';
import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit';
import { loginSchema } from '@/lib/validations/auth';
import { ApiError, handleApiError, successResponse } from '@/lib/api/utils';
import { createRoleHintToken, setRoleHintCookie } from '@/lib/auth/roleHint';
import { getHomeForRole } from '@/lib/auth/routing';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
export async function POST(request) {
    try {
        const rateLimit = assertRateLimit({
            key: 'auth:login',
            limit: 8,
            windowMs: 60_000,
            request,
            message: 'Too many login attempts. Please wait a minute and try again.',
        });
        const payload = loginSchema.parse(await request.json());
        const supabase = await createSupabaseRouteHandlerClient();
        let data;
        let error;
        try {
            const authResponse = await supabase.auth.signInWithPassword({
                email: payload.email.toLowerCase(),
                password: payload.password,
            });
            data = authResponse.data;
            error = authResponse.error;
        }
        catch {
            throw new ApiError(500, 'Supabase auth request failed. Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel and redeploy.');
        }
        if (error || !data.user) {
            throw new ApiError(401, error?.message ?? 'Invalid credentials');
        }
        const normalizedEmail = data.user.email?.toLowerCase();
        if (!normalizedEmail) {
            throw new ApiError(400, 'A verified email is required to finish login.');
        }
        await prisma.user.updateMany({
            where: {
                OR: [{ supabaseId: data.user.id }, { email: normalizedEmail }],
            },
            data: {
                lastLogin: new Date(),
                supabaseId: data.user.id,
                ...(data.user.email_confirmed_at ? { emailVerified: true } : {}),
            },
        });
        const profile = await prisma.user.findFirst({
            where: {
                OR: [{ supabaseId: data.user.id }, { email: normalizedEmail }],
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
        if (!profile) {
            throw new ApiError(404, 'User profile not found');
        }
        const response = successResponse({
            user: data.user,
            session: data.session,
            profile,
            needsOnboarding: !profile.onboardingComplete,
            destination: getHomeForRole(profile),
        });
        const roleHintToken = await createRoleHintToken(data.user.id, profile.role);
        setRoleHintCookie(response, roleHintToken);
        return withRateLimitHeaders(response, rateLimit);
    }
    catch (error) {
        return handleApiError(error);
    }
}
