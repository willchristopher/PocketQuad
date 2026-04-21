import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { readResourceLinkIds } from '@/lib/resourceLinkPreferences';
import { canAccessAdminPortal, hasAnyPortalPermission, hasPortalPermission, resolvePortalPermissions, } from '@/lib/auth/portalPermissions';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';

/**
 * Error class for API handlers that should return a specific HTTP response.
 */
export class ApiError extends Error {
    statusCode;
    headers;
    constructor(statusCode, message, headers) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.headers = headers;
    }
}
const BASE_PROFILE_SELECT = {
    id: true,
    supabaseId: true,
    universityId: true,
    email: true,
    displayName: true,
    firstName: true,
    lastName: true,
    avatar: true,
    role: true,
    emailVerified: true,
    canPublishCampusAnnouncements: true,
    adminAccessLevel: true,
    major: true,
    portalPermissions: true,
    facultyRoleTags: true,
    department: true,
    year: true,
    onboardingComplete: true,
};
const BASE_PROFILE_SELECT_COMPAT = {
    id: true,
    supabaseId: true,
    universityId: true,
    email: true,
    displayName: true,
    firstName: true,
    lastName: true,
    avatar: true,
    role: true,
    emailVerified: true,
    canPublishCampusAnnouncements: true,
    adminAccessLevel: true,
    major: true,
    portalPermissions: true,
    department: true,
    year: true,
    onboardingComplete: true,
};
const BASE_PROFILE_SELECT_LEGACY = {
    id: true,
    supabaseId: true,
    universityId: true,
    email: true,
    displayName: true,
    firstName: true,
    lastName: true,
    avatar: true,
    role: true,
    emailVerified: true,
    canPublishCampusAnnouncements: true,
    major: true,
    department: true,
    year: true,
    onboardingComplete: true,
};
function buildAuthenticatedProfileSelect(options, mode = 'full') {
    const baseSelect = mode === 'full'
        ? BASE_PROFILE_SELECT
        : mode === 'compat'
            ? BASE_PROFILE_SELECT_COMPAT
            : BASE_PROFILE_SELECT_LEGACY;
    const preferenceSelect = mode === 'legacy'
        ? undefined
        : {
            officeHourChanges: true,
            newEvents: true,
            eventReminders: true,
            deadlineReminders: true,
            emailDigest: true,
            pushEnabled: true,
            theme: true,
            buildingAlerts: true,
            buildingIds: true,
            clubInterestIds: true,
            dashboardModules: true,
        };
    return {
        ...baseSelect,
        ...(options.includePreferences && preferenceSelect
            ? {
                notificationPreferences: {
                    select: preferenceSelect,
                },
            }
            : {}),
        ...(options.includeUniversity
            ? {
                university: {
                    select: mode === 'full'
                        ? {
                            id: true,
                            name: true,
                            domain: true,
                            disabledStudentPages: true,
                            themeMainColor: true,
                            themeAccentColor: true,
                        }
                        : {
                            id: true,
                            name: true,
                            domain: true,
                        },
                },
            }
            : {}),
        ...(mode === 'full' && options.includeManagedClubs
            ? {
                managedClubs: {
                    select: {
                        clubId: true,
                        club: {
                            select: {
                                id: true,
                                universityId: true,
                                name: true,
                            },
                        },
                    },
                },
            }
            : {}),
        ...(mode === 'full' && options.includeManagedBuildings
            ? {
                managedBuildings: {
                    select: {
                        buildingId: true,
                        building: {
                            select: {
                                id: true,
                                name: true,
                                type: true,
                            },
                        },
                    },
                },
            }
            : {}),
    };
}
function normalizeAuthenticatedProfile(profile, options) {
    if (!profile) {
        return null;
    }
    return {
        ...profile,
        adminAccessLevel: profile.adminAccessLevel ?? null,
        portalPermissions: profile.portalPermissions ?? [],
        facultyRoleTags: profile.facultyRoleTags ?? [],
        ...(options.includePreferences
            ? {
                notificationPreferences: profile.notificationPreferences
                    ? {
                        officeHourChanges: profile.notificationPreferences.officeHourChanges ?? true,
                        newEvents: profile.notificationPreferences.newEvents ?? true,
                        eventReminders: profile.notificationPreferences.eventReminders ?? true,
                        deadlineReminders: profile.notificationPreferences.deadlineReminders ?? true,
                        emailDigest: profile.notificationPreferences.emailDigest ?? true,
                        pushEnabled: profile.notificationPreferences.pushEnabled ?? false,
                        theme: profile.notificationPreferences.theme ?? 'system',
                        buildingAlerts: profile.notificationPreferences.buildingAlerts ?? false,
                        buildingIds: profile.notificationPreferences.buildingIds ?? [],
                        resourceLinkIds: profile.notificationPreferences.resourceLinkIds ?? [],
                        clubInterestIds: profile.notificationPreferences.clubInterestIds ?? [],
                        dashboardModules: profile.notificationPreferences.dashboardModules ?? [],
                    }
                    : null,
            }
            : {}),
        ...(options.includeUniversity
            ? {
                university: profile.university
                    ? {
                        ...profile.university,
                        disabledStudentPages: profile.university.disabledStudentPages ?? [],
                        themeMainColor: profile.university.themeMainColor ?? null,
                        themeAccentColor: profile.university.themeAccentColor ?? null,
                    }
                    : null,
            }
            : {}),
        ...(options.includeManagedClubs
            ? {
                managedClubs: profile.managedClubs ?? [],
            }
            : {}),
        ...(options.includeManagedBuildings
            ? {
                managedBuildings: profile.managedBuildings ?? [],
            }
            : {}),
    };
}
/**
 * @param {{
 *   includePreferences?: boolean,
 *   includeUniversity?: boolean,
 *   includeManagedClubs?: boolean,
 *   includeManagedBuildings?: boolean,
 *   allowUnverified?: boolean,
 * }} [options]
 */
export async function getAuthenticatedUser(options = {}) {
    const supabase = await createSupabaseRouteHandlerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
        throw new ApiError(401, 'Unauthorized');
    }
    const normalizedEmail = data.user.email?.toLowerCase();
    const where = normalizedEmail
        ? {
            OR: [
                { supabaseId: data.user.id },
                { email: normalizedEmail },
            ],
        }
        : { supabaseId: data.user.id };
    let profile;
    try {
        profile = await prisma.user.findFirst({
            where,
            select: buildAuthenticatedProfileSelect(options, 'full'),
        });
    }
    catch (error) {
        if (!isPrismaSchemaCompatibilityError(error)) {
            throw error;
        }
        try {
            profile = await prisma.user.findFirst({
                where,
                select: buildAuthenticatedProfileSelect(options, 'compat'),
            });
        }
        catch (compatError) {
            if (!isPrismaSchemaCompatibilityError(compatError)) {
                throw compatError;
            }
            profile = await prisma.user.findFirst({
                where,
                select: buildAuthenticatedProfileSelect(options, 'legacy'),
            });
        }
    }
    if (!profile) {
        throw new ApiError(404, 'User profile not found');
    }
    if (options.includePreferences && profile.notificationPreferences) {
        profile = {
            ...profile,
            notificationPreferences: {
                ...profile.notificationPreferences,
                resourceLinkIds: await readResourceLinkIds(profile.id),
            },
        };
    }
    const normalizedProfile = normalizeAuthenticatedProfile(profile, options);
    if (!options.allowUnverified && !normalizedProfile.emailVerified) {
        throw new ApiError(403, 'Email verification required');
    }
    return { supabaseUser: data.user, profile: normalizedProfile };
}
export async function getAuthenticatedAdmin(requiredPermission) {
    return getAuthenticatedPortalUser(requiredPermission);
}
export async function getAuthenticatedPortalUser(requiredPermission) {
    const authenticated = await getAuthenticatedUser({
        includeManagedClubs: true,
    });
    if (!canAccessAdminPortal(authenticated.profile)) {
        throw new ApiError(403, 'Portal access required');
    }
    if (requiredPermission) {
        const required = Array.isArray(requiredPermission)
            ? requiredPermission
            : [requiredPermission];
        const hasAll = required.every((permission) => hasPortalPermission(authenticated.profile, permission));
        if (!hasAll) {
            throw new ApiError(403, 'You do not have permission for this action');
        }
    }
    return {
        ...authenticated,
        resolvedPermissions: resolvePortalPermissions(authenticated.profile),
    };
}
/**
 * @param {string[] | null | undefined} permissions
 */
export function requireAnyPortalPermission(profile, permissions) {
    if (!hasAnyPortalPermission(profile, permissions)) {
        throw new ApiError(403, 'You do not have permission for this action');
    }
}
/**
 * @template T
 * @param {T} data
 * @param {number} [status]
 */
export function successResponse(data, status = 200) {
    return NextResponse.json({ data }, { status });
}
export function handleApiError(error) {
    if (error instanceof ZodError) {
        const flat = error.flatten();
        const fieldMessages = Object.entries(flat.fieldErrors)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`);
        const formMessages = flat.formErrors;
        const firstMessage = fieldMessages[0] ?? formMessages[0] ?? 'Validation failed';
        return NextResponse.json({
            error: firstMessage,
            issues: flat,
        }, { status: 400 });
    }
    if (error instanceof ApiError) {
        return NextResponse.json({
            error: error.message,
        }, { status: error.statusCode, headers: error.headers });
    }
    console.error(error);
    return NextResponse.json({
        error: 'Internal server error',
    }, { status: 500 });
}
/**
 * @template T
 * @param {Request} request
 * @returns {Promise<T>}
 */
export async function parseJsonBody(request) {
    return (await request.json());
}
/**
 * @template T
 * @param {{ params: Promise<T> }} context
 * @returns {Promise<T>}
 */
export async function resolveParams(context) {
    return context.params;
}
export function parseBoolean(value) {
    if (value === null)
        return undefined;
    return value === 'true';
}
export function parseNumber(value, defaultValue) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
}
