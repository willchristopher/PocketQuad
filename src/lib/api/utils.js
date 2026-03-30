import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { attachDashboardModules } from '@/lib/dashboardPreferences';
import { prisma } from '@/lib/prisma';
import { canAccessAdminPortal, hasAnyPortalPermission, hasPortalPermission, resolvePortalPermissions, } from '@/lib/auth/portalPermissions';
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
async function ensureFacultyProfile(profile) {
    if (profile.role !== 'FACULTY') {
        return;
    }
    const normalizedDisplayName = profile.displayName.trim();
    const fallbackName = `${profile.firstName} ${profile.lastName}`.trim();
    const name = normalizedDisplayName || fallbackName || profile.email;
    await prisma.faculty.upsert({
        where: {
            userId: profile.id,
        },
        update: {
            email: profile.email,
            universityId: profile.universityId,
            name,
            department: profile.department ?? 'General',
            tags: profile.facultyRoleTags,
        },
        create: {
            userId: profile.id,
            universityId: profile.universityId,
            name,
            title: 'Faculty Member',
            department: profile.department ?? 'General',
            email: profile.email,
            officeLocation: 'TBD',
            officeHours: 'TBD',
            courses: [],
            tags: profile.facultyRoleTags,
        },
    });
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
    portalPermissions: true,
    facultyRoleTags: true,
    department: true,
};
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
    const profile = await prisma.user.findFirst({
        where,
        select: {
            ...BASE_PROFILE_SELECT,
            ...(options.includePreferences
                ? {
                    notificationPreferences: {
                        select: {
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
                        },
                    },
                }
                : {}),
            ...(options.includeUniversity
                ? {
                    university: {
                        select: {
                            id: true,
                            name: true,
                            domain: true,
                            disabledStudentPages: true,
                        },
                    },
                }
                : {}),
            ...(options.includeManagedClubs
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
            ...(options.includeManagedBuildings
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
        },
    });
    const profileWithDashboardModules = await attachDashboardModules(profile);
    if (!profileWithDashboardModules) {
        throw new ApiError(404, 'User profile not found');
    }
    if (!profileWithDashboardModules.supabaseId) {
        await prisma.user.update({
            where: { id: profileWithDashboardModules.id },
            data: { supabaseId: data.user.id },
        });
    }
    if (!options.allowUnverified && !profileWithDashboardModules.emailVerified) {
        throw new ApiError(403, 'Email verification required');
    }
    await ensureFacultyProfile(profileWithDashboardModules);
    return { supabaseUser: data.user, profile: profileWithDashboardModules };
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
