import { prisma } from '@/lib/prisma';
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse, } from '@/lib/api/utils';
function isOwnerAccount(profile) {
    return (profile.adminAccessLevel === 'OWNER' ||
        (profile.role === 'ADMIN' && profile.adminAccessLevel == null));
}
export async function GET(request) {
    try {
        const { profile } = await getAuthenticatedAdmin('ADMIN_TAB_USERS');
        const isOwner = isOwnerAccount(profile);
        const requestedUniversityId = request.nextUrl.searchParams.get('universityId') ?? undefined;
        const search = request.nextUrl.searchParams.get('search')?.trim();
        const roleFilter = request.nextUrl.searchParams.get('role')?.trim();
        if (!isOwner &&
            requestedUniversityId &&
            requestedUniversityId !== profile.universityId) {
            throw new ApiError(403, 'You can only view users for your own university');
        }
        const scopedUniversityId = isOwner
            ? requestedUniversityId
            : profile.universityId ?? requestedUniversityId;
        const users = await prisma.user.findMany({
            where: {
                ...(scopedUniversityId ? { universityId: scopedUniversityId } : {}),
                ...(roleFilter ? { role: roleFilter } : {}),
                ...(search
                    ? {
                        OR: [
                            { email: { contains: search, mode: 'insensitive' } },
                            {
                                displayName: {
                                    contains: search,
                                    mode: 'insensitive',
                                },
                            },
                            {
                                firstName: {
                                    contains: search,
                                    mode: 'insensitive',
                                },
                            },
                            {
                                lastName: {
                                    contains: search,
                                    mode: 'insensitive',
                                },
                            },
                        ],
                    }
                    : {}),
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                displayName: true,
                role: true,
                adminAccessLevel: true,
                major: true,
                department: true,
                year: true,
                emailVerified: true,
                onboardingComplete: true,
                createdAt: true,
                lastLogin: true,
                university: { select: { id: true, name: true, slug: true } },
            },
            orderBy: [{ role: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
        });
        return successResponse(users);
    }
    catch (error) {
        return handleApiError(error);
    }
}
