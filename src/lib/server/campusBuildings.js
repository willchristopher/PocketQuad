import { ApiError } from '@/lib/api/utils';
import { prisma } from '@/lib/prisma';
import { isMissingDatabaseFieldError } from '@/lib/server/dbCompatibility';

const universitySelect = {
    select: {
        id: true,
        name: true,
        slug: true,
    },
};
const campusBuildingSelect = {
    id: true,
    universityId: true,
    name: true,
    code: true,
    type: true,
    address: true,
    mapQuery: true,
    latitude: true,
    longitude: true,
    purpose: true,
    description: true,
    accessibilityNotes: true,
    operatingHours: true,
    operationalStatus: true,
    operationalNote: true,
    operationalUpdatedAt: true,
    categories: true,
    services: true,
    departments: true,
    createdAt: true,
    updatedAt: true,
    university: universitySelect,
};
const legacyCampusBuildingSelect = {
    id: true,
    universityId: true,
    name: true,
    code: true,
    type: true,
    address: true,
    mapQuery: true,
    purpose: true,
    description: true,
    accessibilityNotes: true,
    operatingHours: true,
    operationalStatus: true,
    operationalNote: true,
    operationalUpdatedAt: true,
    categories: true,
    services: true,
    departments: true,
    createdAt: true,
    updatedAt: true,
    university: universitySelect,
};
/**
 * @template {Record<string, unknown>} T
 * @param {T} record
 * @returns {T & { latitude: number | null, longitude: number | null }}
 */
function withLocationDefaults(record) {
    return {
        ...record,
        latitude: 'latitude' in record && typeof record.latitude !== 'undefined'
            ? (record.latitude ?? null)
            : null,
        longitude: 'longitude' in record && typeof record.longitude !== 'undefined'
            ? (record.longitude ?? null)
            : null,
    };
}
/**
 * @param {{ latitude?: unknown, longitude?: unknown }} data
 */
function ensureLegacyDatabaseCanSkipCoordinates(data) {
    const hasCoordinateValue = typeof data.latitude === 'number' ||
        typeof data.longitude === 'number';
    if (hasCoordinateValue) {
        throw new ApiError(409, 'Apply the latest database migration before saving building coordinates');
    }
}
/**
 * @template {{ latitude?: unknown, longitude?: unknown }} T
 * @param {T} data
 * @returns {Omit<T, 'latitude' | 'longitude'>}
 */
function withoutCoordinates(data) {
    const { latitude: _latitude, longitude: _longitude, ...legacyData } = data;
    return legacyData;
}
/**
 * @param {{
 *   where?: import('@prisma/client').Prisma.CampusBuildingWhereInput,
 *   orderBy?: import('@prisma/client').Prisma.CampusBuildingOrderByWithRelationInput | import('@prisma/client').Prisma.CampusBuildingOrderByWithRelationInput[],
 * }} params
 */
export async function listCampusBuildingsCompatible({ where, orderBy, }) {
    try {
        const records = await prisma.campusBuilding.findMany({
            where,
            orderBy,
            select: campusBuildingSelect,
        });
        return records.map((record) => withLocationDefaults(record));
    }
    catch (error) {
        if (!isMissingDatabaseFieldError(error)) {
            throw error;
        }
        const records = await prisma.campusBuilding.findMany({
            where,
            orderBy,
            select: legacyCampusBuildingSelect,
        });
        return records.map((record) => withLocationDefaults(record));
    }
}
/**
 * @param {import('@prisma/client').Prisma.CampusBuildingUncheckedCreateInput & {
 *   latitude?: number,
 *   longitude?: number,
 * }} data
 */
export async function createCampusBuildingCompatible(data) {
    try {
        const record = await prisma.campusBuilding.create({
            data,
            select: campusBuildingSelect,
        });
        return withLocationDefaults(record);
    }
    catch (error) {
        if (!isMissingDatabaseFieldError(error)) {
            throw error;
        }
        ensureLegacyDatabaseCanSkipCoordinates(data);
        const legacyData = withoutCoordinates(data);
        const record = await prisma.campusBuilding.create({
            data: legacyData,
            select: legacyCampusBuildingSelect,
        });
        return withLocationDefaults(record);
    }
}
/**
 * @param {string} id
 * @param {import('@prisma/client').Prisma.CampusBuildingUncheckedUpdateInput & {
 *   latitude?: number | null,
 *   longitude?: number | null,
 * }} data
 */
export async function updateCampusBuildingCompatible(id, data) {
    try {
        const record = await prisma.campusBuilding.update({
            where: { id },
            data,
            select: campusBuildingSelect,
        });
        return withLocationDefaults(record);
    }
    catch (error) {
        if (!isMissingDatabaseFieldError(error)) {
            throw error;
        }
        ensureLegacyDatabaseCanSkipCoordinates(data);
        const legacyData = withoutCoordinates(data);
        const record = await prisma.campusBuilding.update({
            where: { id },
            data: legacyData,
            select: legacyCampusBuildingSelect,
        });
        return withLocationDefaults(record);
    }
}
