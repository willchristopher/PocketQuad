import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils';
import { listCampusBuildingsCompatible } from '@/lib/server/campusBuildings';
import { getActiveAnnouncementWhere, purgeExpiredAnnouncements } from '@/lib/server/announcements';
import { getBuildingsCached } from '@/lib/server/universityData';
function normalizeSearchValue(value) {
    return value?.trim().toLowerCase() ?? '';
}
function fieldMatchesQuery(value, query) {
    if (!value)
        return false;
    return value.toLowerCase().includes(query);
}
function listMatchesQuery(values, query) {
    if (!values || values.length === 0)
        return false;
    return values.some((value) => fieldMatchesQuery(value, query));
}
async function getBuildingsForRequest(universityId, query) {
    try {
        return await getBuildingsCached(universityId, query);
    }
    catch (error) {
        console.error('Falling back to uncached buildings query', error);
        const records = await listCampusBuildingsCompatible({
            where: {
                ...(universityId ? { universityId } : {}),
            },
            orderBy: [{ name: 'asc' }],
        });
        const normalizedQuery = normalizeSearchValue(query);
        if (!normalizedQuery) {
            return records;
        }
        return records.filter((record) => [
            record.name,
            record.code,
            record.type,
            record.address,
            record.description,
            record.purpose,
            record.mapQuery,
        ].some((value) => fieldMatchesQuery(value, normalizedQuery)) ||
            listMatchesQuery(record.categories, normalizedQuery) ||
            listMatchesQuery(record.services, normalizedQuery) ||
            listMatchesQuery(record.departments, normalizedQuery));
    }
}
export async function GET(request) {
    try {
        const { profile } = await getAuthenticatedUser();
        const query = request.nextUrl.searchParams.get('search')?.trim();
        const requestedUniversityId = request.nextUrl.searchParams.get('universityId') ?? undefined;
        const universityId = profile.role === 'ADMIN' && requestedUniversityId
            ? requestedUniversityId
            : profile.universityId ?? undefined;
        const buildings = await getBuildingsForRequest(universityId, query);
        const preferences = await prisma.notificationPreferences.findUnique({
            where: { userId: profile.id },
            select: {
                buildingIds: true,
            },
        }).catch((error) => {
            console.error('Unable to load building notification preferences', error);
            return null;
        });
        const favoritedBuildingIds = new Set(preferences?.buildingIds ?? []);
        const buildingIds = buildings.map((building) => building.id);
        const now = new Date();
        await purgeExpiredAnnouncements(universityId);
        const [announcements, events] = buildingIds.length
            ? await Promise.all([
                prisma.announcement.findMany({
                    where: {
                        universityId,
                        scope: 'BUILDING',
                        buildingId: {
                            in: buildingIds,
                        },
                        ...getActiveAnnouncementWhere(now),
                    },
                    select: {
                        id: true,
                        buildingId: true,
                        title: true,
                        message: true,
                        expiresAt: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 100,
                }).catch((error) => {
                    console.error('Unable to load building announcements', error);
                    return [];
                }),
                prisma.event.findMany({
                    where: {
                        universityId,
                        buildingId: {
                            in: buildingIds,
                        },
                        isPublished: true,
                        isCancelled: false,
                        date: { gte: now },
                    },
                    select: {
                        id: true,
                        buildingId: true,
                        title: true,
                        date: true,
                        time: true,
                        category: true,
                    },
                    orderBy: { date: 'asc' },
                    take: 100,
                }).catch((error) => {
                    console.error('Unable to load building events', error);
                    return [];
                }),
            ])
            : [[], []];
        const announcementsByBuilding = new Map();
        for (const item of announcements) {
            if (!item.buildingId)
                continue;
            const current = announcementsByBuilding.get(item.buildingId) ?? [];
            if (current.length < 3) {
                current.push(item);
                announcementsByBuilding.set(item.buildingId, current);
            }
        }
        const eventsByBuilding = new Map();
        for (const item of events) {
            if (!item.buildingId)
                continue;
            const current = eventsByBuilding.get(item.buildingId) ?? [];
            if (current.length < 3) {
                current.push(item);
                eventsByBuilding.set(item.buildingId, current);
            }
        }
        return successResponse(buildings.map((building) => ({
            ...building,
            isFavorited: favoritedBuildingIds.has(building.id),
            announcements: announcementsByBuilding.get(building.id) ?? [],
            upcomingEvents: eventsByBuilding.get(building.id) ?? [],
        })));
    }
    catch (error) {
        return handleApiError(error);
    }
}
