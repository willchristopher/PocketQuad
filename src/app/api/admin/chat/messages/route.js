import { prisma } from '@/lib/prisma';
import { ApiError, getAuthenticatedAdmin, handleApiError, parseNumber, successResponse } from '@/lib/api/utils';

function isOwnerAccount(profile) {
    return (profile.adminAccessLevel === 'OWNER' ||
        (profile.role === 'ADMIN' && profile.adminAccessLevel == null));
}

function serializeMessage(message) {
    return {
        ...message,
        reportCount: message._count.reports,
        reports: message.reports.map((report) => ({
            id: report.id,
            reason: report.reason,
            createdAt: report.createdAt,
            reporter: report.reporter,
        })),
        _count: undefined,
    };
}

export async function GET(request) {
    try {
        const { profile } = await getAuthenticatedAdmin('ADMIN_TAB_CHAT');
        const isOwner = isOwnerAccount(profile);
        const requestedUniversityId = request.nextUrl.searchParams.get('universityId') ?? undefined;
        const reportedOnly = request.nextUrl.searchParams.get('reportedOnly') === 'true';
        const search = request.nextUrl.searchParams.get('search')?.trim();
        const limit = Math.min(200, Math.max(1, parseNumber(request.nextUrl.searchParams.get('limit'), 80)));
        if (!isOwner &&
            requestedUniversityId &&
            requestedUniversityId !== profile.universityId) {
            throw new ApiError(403, 'You can only review chat messages for your own university');
        }
        const scopedUniversityId = isOwner
            ? requestedUniversityId
            : profile.universityId ?? requestedUniversityId;
        const messages = await prisma.chatMessage.findMany({
            where: {
                isDeleted: false,
                ...(scopedUniversityId ? { user: { universityId: scopedUniversityId } } : {}),
                ...(reportedOnly ? { reports: { some: {} } } : {}),
                ...(search
                    ? {
                        OR: [
                            { content: { contains: search, mode: 'insensitive' } },
                            { user: { displayName: { contains: search, mode: 'insensitive' } } },
                            { user: { email: { contains: search, mode: 'insensitive' } } },
                            { channel: { name: { contains: search, mode: 'insensitive' } } },
                        ],
                    }
                    : {}),
            },
            include: {
                channel: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        email: true,
                        avatar: true,
                        role: true,
                        universityId: true,
                    },
                },
                reports: {
                    include: {
                        reporter: {
                            select: {
                                id: true,
                                displayName: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                _count: {
                    select: {
                        reports: true,
                    },
                },
            },
            orderBy: [
                { reports: { _count: 'desc' } },
                { createdAt: 'desc' },
            ],
            take: limit,
        });
        return successResponse(messages.map(serializeMessage));
    }
    catch (error) {
        return handleApiError(error);
    }
}
