import { revalidateTag, unstable_cache } from 'next/cache';
import { getStudentFacingFacultyAvailability, parseLegacyFacultyAvailability, } from '@/lib/faculty';
import { prisma } from '@/lib/prisma';
import { listCampusBuildingsCompatible } from '@/lib/server/campusBuildings';
import { isMissingDatabaseFieldError } from '@/lib/server/dbCompatibility';
export const UNIVERSITY_DATA_TAGS = {
    buildings: 'university-buildings',
    clubs: 'university-clubs',
    faculty: 'university-faculty',
    resourceLinks: 'university-resource-links',
    services: 'university-services',
    studentPages: 'university-student-pages',
    theme: 'university-theme',
};
export const ALL_UNIVERSITY_DATA_TAGS = Object.values(UNIVERSITY_DATA_TAGS);
const UNIVERSITY_DATA_TTL_SECONDS = 30;
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
export function invalidateUniversityData(...tags) {
    for (const tag of tags) {
        revalidateTag(tag, 'max');
    }
}
const getCampusServicesCachedInternal = unstable_cache(async (universityId, status) => {
    return prisma.campusService.findMany({
        where: {
            ...(universityId ? { universityId } : {}),
            ...(status ? { status } : {}),
        },
        include: {
            university: {
                select: { id: true, name: true, slug: true },
            },
        },
        orderBy: [{ name: 'asc' }],
    });
}, ['campus-services'], { revalidate: UNIVERSITY_DATA_TTL_SECONDS, tags: [UNIVERSITY_DATA_TAGS.services] });
const getResourceLinksCachedInternal = unstable_cache(async (universityId, category, query) => {
    return prisma.campusResourceLink.findMany({
        where: {
            ...(universityId ? { universityId } : {}),
            ...(category ? { category } : {}),
            ...(query
                ? {
                    OR: [
                        { label: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                }
                : {}),
        },
        include: {
            university: {
                select: { id: true, name: true, slug: true },
            },
        },
        orderBy: [{ category: 'asc' }, { label: 'asc' }],
    });
}, ['campus-resource-links'], { revalidate: UNIVERSITY_DATA_TTL_SECONDS, tags: [UNIVERSITY_DATA_TAGS.resourceLinks] });
const getClubsCachedInternal = unstable_cache(async (universityId, category, query) => {
    return prisma.clubOrganization.findMany({
        where: {
            ...(universityId ? { universityId } : {}),
            ...(category ? { category } : {}),
            ...(query
                ? {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                }
                : {}),
        },
        include: {
            university: {
                select: { id: true, name: true, slug: true },
            },
        },
        orderBy: [{ name: 'asc' }],
    });
}, ['club-organizations'], { revalidate: UNIVERSITY_DATA_TTL_SECONDS, tags: [UNIVERSITY_DATA_TAGS.clubs] });
const getBuildingsCachedInternal = unstable_cache(async (universityId, query) => {
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
}, ['campus-buildings'], { revalidate: UNIVERSITY_DATA_TTL_SECONDS, tags: [UNIVERSITY_DATA_TAGS.buildings] });
const getFacultyCachedInternal = unstable_cache(async (universityId, department, query, viewerId) => {
    const where = {
        ...(universityId ? { universityId } : {}),
        ...(department ? { department } : {}),
        ...(query
            ? {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { title: { contains: query, mode: 'insensitive' } },
                    { department: { contains: query, mode: 'insensitive' } },
                    { officeLocation: { contains: query, mode: 'insensitive' } },
                    { tags: { hasSome: [query] } },
                ],
            }
            : {}),
    };
    try {
        const faculty = await prisma.faculty.findMany({
            where,
            select: {
                id: true,
                userId: true,
                universityId: true,
                name: true,
                title: true,
                department: true,
                email: true,
                phone: true,
                officeLocation: true,
                officeHours: true,
                imageUrl: true,
                bio: true,
                courses: true,
                rating: true,
                ratingCount: true,
                tags: true,
                availabilityStatus: true,
                availabilityNote: true,
                officeHourSlots: {
                    select: {
                        dayOfWeek: true,
                        startTime: true,
                        endTime: true,
                    },
                    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
                },
                favorites: {
                    where: {
                        userId: viewerId,
                    },
                    select: {
                        id: true,
                    },
                },
            },
            orderBy: [{ department: 'asc' }, { name: 'asc' }],
        });
        return faculty.map(({ favorites, officeHourSlots, ...item }) => {
            const studentAvailability = getStudentFacingFacultyAvailability(item.availabilityStatus, item.availabilityNote, officeHourSlots);
            return {
                ...item,
                studentAvailabilityLabel: studentAvailability.label,
                studentAvailabilityState: studentAvailability.state,
                isFavorited: favorites.length > 0,
            };
        });
    }
    catch (error) {
        if (!isMissingDatabaseFieldError(error)) {
            throw error;
        }
        const faculty = await prisma.faculty.findMany({
            where,
            select: {
                id: true,
                userId: true,
                universityId: true,
                name: true,
                title: true,
                department: true,
                email: true,
                phone: true,
                officeLocation: true,
                officeHours: true,
                imageUrl: true,
                bio: true,
                courses: true,
                rating: true,
                ratingCount: true,
                tags: true,
                officeHourSlots: {
                    select: {
                        dayOfWeek: true,
                        startTime: true,
                        endTime: true,
                    },
                    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
                },
                favorites: {
                    where: {
                        userId: viewerId,
                    },
                    select: {
                        id: true,
                    },
                },
            },
            orderBy: [{ department: 'asc' }, { name: 'asc' }],
        });
        return faculty.map(({ favorites, officeHourSlots, ...item }) => {
            const availability = parseLegacyFacultyAvailability(item.officeHours);
            const studentAvailability = getStudentFacingFacultyAvailability(availability.status, availability.note, officeHourSlots);
            return {
                ...item,
                availabilityStatus: availability.status,
                availabilityNote: availability.note || null,
                studentAvailabilityLabel: studentAvailability.label,
                studentAvailabilityState: studentAvailability.state,
                isFavorited: favorites.length > 0,
            };
        });
    }
}, ['faculty-directory'], { revalidate: UNIVERSITY_DATA_TTL_SECONDS, tags: [UNIVERSITY_DATA_TAGS.faculty] });
const getUniversityThemeCachedInternal = unstable_cache(async (universityId) => {
    return prisma.university.findUnique({
        where: { id: universityId },
        select: {
            id: true,
            name: true,
            slug: true,
            themeMainColor: true,
            themeAccentColor: true,
        },
    });
}, ['university-theme'], { revalidate: UNIVERSITY_DATA_TTL_SECONDS, tags: [UNIVERSITY_DATA_TAGS.theme] });
export function getCampusServicesCached(universityId, status) {
    return getCampusServicesCachedInternal(universityId ?? null, status ?? null);
}
export function getResourceLinksCached(universityId, category, query) {
    return getResourceLinksCachedInternal(universityId ?? null, category ?? null, query ?? null);
}
export function getClubsCached(universityId, category, query) {
    return getClubsCachedInternal(universityId ?? null, category ?? null, query ?? null);
}
export function getBuildingsCached(universityId, query) {
    return getBuildingsCachedInternal(universityId ?? null, query ?? null);
}
export function getFacultyCached(universityId, department, query, viewerId) {
    return getFacultyCachedInternal(universityId ?? null, department ?? null, query ?? null, viewerId);
}
export function getUniversityThemeCached(universityId) {
    return getUniversityThemeCachedInternal(universityId);
}
