import { prisma } from '@/lib/prisma';
import { isMissingDatabaseFieldError } from '@/lib/server/dbCompatibility';

export function getActiveAnnouncementWhere(now = new Date()) {
    return {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };
}

export async function purgeExpiredAnnouncements(universityId) {
    if (!universityId) {
        return;
    }

    const now = new Date();
    try {
        await prisma.announcement.deleteMany({
            where: {
                ...(universityId ? { universityId } : {}),
                isActive: true,
                expiresAt: {
                    lte: now,
                },
            },
        });
    }
    catch (error) {
        if (!isMissingDatabaseFieldError(error)) {
            throw error;
        }
    }
}

export function getAnnouncementAudienceLabel(announcement) {
    if (announcement.scope === 'BUILDING') {
        return announcement.building?.name ?? 'Building update';
    }
    if (announcement.scope === 'SERVICE') {
        return announcement.service?.name ?? 'Service update';
    }
    return 'Whole campus';
}
export async function listUniversityAnnouncements(universityId, take = 10) {
    if (!universityId) {
        return [];
    }

    let announcements;
    try {
        announcements = await prisma.announcement.findMany({
            where: {
                universityId,
                ...getActiveAnnouncementWhere(),
            },
            select: {
                id: true,
                title: true,
                message: true,
                linkUrl: true,
                expiresAt: true,
                scope: true,
                createdAt: true,
                createdBy: {
                    select: {
                        displayName: true,
                    },
                },
                building: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                service: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take,
        });
    }
    catch (error) {
        if (!isMissingDatabaseFieldError(error)) {
            throw error;
        }
        announcements = await prisma.announcement.findMany({
            where: { isActive: true },
            select: {
                id: true,
                title: true,
                message: true,
                linkUrl: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take,
        }).then((items) => items.map((item) => ({
            ...item,
            expiresAt: null,
            scope: 'CAMPUS',
            createdBy: null,
            building: null,
            service: null,
        })));
    }
    return announcements.map((announcement) => ({
        ...announcement,
        authorName: announcement.createdBy?.displayName ?? null,
        audienceLabel: getAnnouncementAudienceLabel(announcement),
    }));
}
