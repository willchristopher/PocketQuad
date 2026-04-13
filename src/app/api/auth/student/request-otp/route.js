import crypto from 'node:crypto';
import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit';
import { prisma } from '@/lib/prisma';
import { ApiError, handleApiError, successResponse } from '@/lib/api/utils';
import { ACTIVE_ACCOUNT_STATUS, assertDormantAccountMatch, getAccountStatus, isDormantUserRecord } from '@/lib/auth/dormantAccounts';
import { createSupabaseAdminClient, createSupabaseRouteHandlerClient, } from '@/lib/supabase/server';
import { extractEmailDomain } from '@/lib/university';
import { studentRequestOtpSchema } from '@/lib/validations/auth';
export const runtime = 'nodejs';
async function ensureSupabaseStudentAuthUser(seed) {
    const supabaseAdmin = createSupabaseAdminClient();
    const { error } = await supabaseAdmin.auth.admin.createUser({
        email: seed.email,
        password: `PocketQuad-${crypto.randomUUID()}-A1!`,
        email_confirm: true,
        user_metadata: {
            firstName: seed.firstName,
            lastName: seed.lastName,
            role: 'STUDENT',
        },
    });
    if (!error) {
        return;
    }
    const errorMessage = error.message?.toLowerCase() ?? '';
    if (errorMessage.includes('already') && errorMessage.includes('registered')) {
        return;
    }
    throw new ApiError(500, error.message ?? 'Unable to initialize student auth account');
}
export async function POST(request) {
    try {
        const rateLimit = assertRateLimit({
            key: 'auth:student-request-otp',
            limit: 5,
            windowMs: 10 * 60_000,
            request,
            message: 'Too many student verification requests. Please wait before trying again.',
        });
        const payload = studentRequestOtpSchema.parse(await request.json());
        const email = payload.email.toLowerCase();
        const emailDomain = extractEmailDomain(email);
        if (!emailDomain) {
            throw new ApiError(400, 'A university email address is required');
        }
        const matchedUniversity = await prisma.university.findFirst({
            where: { domain: emailDomain },
            select: { id: true, name: true },
        });
        if (!matchedUniversity) {
            throw new ApiError(400, 'This email domain is not linked to a registered university in PocketQuad.');
        }
        const dormantAccount = await assertDormantAccountMatch({
            email,
            requestedRole: 'STUDENT',
            dormantAccountId: payload.dormantAccountId,
        });
        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                role: true,
                lastLogin: true,
                onboardingComplete: true,
                adminAccessLevel: true,
                portalPermissions: true,
            },
        });
        if (existingUser && !isDormantUserRecord(existingUser)) {
            throw new ApiError(409, 'Email is already registered');
        }
        await ensureSupabaseStudentAuthUser({
            email,
            firstName: dormantAccount?.firstName ?? payload.firstName,
            lastName: dormantAccount?.lastName ?? payload.lastName,
        });
        const supabase = await createSupabaseRouteHandlerClient();
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: false,
            },
        });
        if (error) {
            throw new ApiError(400, error.message || 'Unable to send one-time passcode');
        }
        return withRateLimitHeaders(successResponse({
            sent: true,
            universityId: matchedUniversity.id,
            universityName: matchedUniversity.name,
            accountStatus: dormantAccount ? getAccountStatus(dormantAccount) : ACTIVE_ACCOUNT_STATUS,
        }), rateLimit);
    }
    catch (error) {
        return handleApiError(error);
    }
}
