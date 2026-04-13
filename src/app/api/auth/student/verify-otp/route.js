import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit';
import { prisma } from '@/lib/prisma';
import { ApiError, handleApiError, successResponse } from '@/lib/api/utils';
import { assertDormantAccountMatch, isDormantUserRecord } from '@/lib/auth/dormantAccounts';
import { createRoleHintToken, setRoleHintCookie } from '@/lib/auth/roleHint';
import { getHomeForRole } from '@/lib/auth/routing';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { extractEmailDomain } from '@/lib/university';
import { studentVerifyOtpSchema } from '@/lib/validations/auth';
export const runtime = 'nodejs';
async function ensureCampusRoomMembership(userId) {
    const existingChannel = await prisma.channel.findFirst({
        where: {
            type: 'PUBLIC',
            name: {
                in: ['Campus Chat', 'General'],
            },
        },
        select: { id: true, name: true, description: true },
        orderBy: { createdAt: 'asc' },
    });
    const channel = existingChannel
        ? (existingChannel.name === 'Campus Chat'
            ? existingChannel
            : await prisma.channel.update({
                where: { id: existingChannel.id },
                data: {
                    name: 'Campus Chat',
                    description: existingChannel.description || 'Campus-wide respectful conversation and updates',
                },
                select: { id: true },
            }))
        :
            (await prisma.channel.create({
                data: {
                    name: 'Campus Chat',
                    description: 'Campus-wide respectful conversation and updates',
                    type: 'PUBLIC',
                    createdById: userId,
                },
                select: { id: true },
            }));
    await prisma.channelMember.upsert({
        where: {
            channelId_userId: {
                channelId: channel.id,
                userId,
            },
        },
        update: {},
        create: {
            channelId: channel.id,
            userId,
            role: 'member',
        },
    });
}
export async function POST(request) {
    try {
        const rateLimit = assertRateLimit({
            key: 'auth:student-verify-otp',
            limit: 10,
            windowMs: 10 * 60_000,
            request,
            message: 'Too many student verification attempts. Please request a new code and try again later.',
        });
        const payload = studentVerifyOtpSchema.parse(await request.json());
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
        const supabase = await createSupabaseRouteHandlerClient();
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token: payload.code,
            type: 'email',
        });
        if (error || !data.user) {
            throw new ApiError(400, error?.message ?? 'Invalid or expired one-time passcode');
        }
        const normalizedAuthEmail = data.user.email?.toLowerCase();
        if (normalizedAuthEmail && normalizedAuthEmail !== email) {
            throw new ApiError(400, 'Verification email does not match this student account');
        }
        const verifiedAuthUser = data.user;
        const existingBySupabaseId = await prisma.user.findUnique({
            where: { supabaseId: verifiedAuthUser.id },
            select: { id: true },
        });
        if (existingBySupabaseId && existingBySupabaseId.id !== dormantAccount?.id) {
            throw new ApiError(409, 'This verification session is already linked to an existing account.');
        }
        const { error: updateError } = await supabase.auth.updateUser({
            password: payload.password,
            data: {
                firstName: dormantAccount?.firstName ?? payload.firstName,
                lastName: dormantAccount?.lastName ?? payload.lastName,
                role: 'STUDENT',
            },
        });
        if (updateError) {
            throw new ApiError(400, updateError.message || 'Unable to finalize student credentials');
        }
        const createdUser = await prisma.$transaction(async (tx) => {
            const user = dormantAccount
                ? await tx.user.update({
                    where: { id: dormantAccount.id },
                    data: {
                        supabaseId: verifiedAuthUser.id,
                        email,
                        displayName: dormantAccount.displayName,
                        firstName: dormantAccount.firstName,
                        lastName: dormantAccount.lastName,
                        role: 'STUDENT',
                        universityId: matchedUniversity.id,
                        emailVerified: true,
                        lastLogin: new Date(),
                    },
                })
                : await tx.user.create({
                    data: {
                        supabaseId: verifiedAuthUser.id,
                        email,
                        displayName: `${payload.firstName} ${payload.lastName}`,
                        firstName: payload.firstName,
                        lastName: payload.lastName,
                        role: 'STUDENT',
                        universityId: matchedUniversity.id,
                        emailVerified: true,
                        lastLogin: new Date(),
                    },
                });
            await tx.notificationPreferences.upsert({
                where: {
                    userId: user.id,
                },
                update: {},
                create: {
                    userId: user.id,
                },
            });
            return user;
        });
        await ensureCampusRoomMembership(createdUser.id);
        const profile = await prisma.user.findUnique({
            where: { id: createdUser.id },
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
            needsOnboarding: !profile?.onboardingComplete,
            destination: getHomeForRole(profile),
        });
        const roleHintToken = await createRoleHintToken(verifiedAuthUser.id, createdUser.role);
        setRoleHintCookie(response, roleHintToken);
        return withRateLimitHeaders(response, rateLimit);
    }
    catch (error) {
        return handleApiError(error);
    }
}
