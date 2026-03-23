import type { Prisma } from '@prisma/client'

import { ApiError } from '@/lib/api/utils'
import { prisma } from '@/lib/prisma'
import { isMissingDatabaseFieldError } from '@/lib/server/dbCompatibility'

const universitySelect = {
  select: {
    id: true,
    name: true,
    slug: true,
  },
} as const

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
} as const

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
} as const

function withLocationDefaults<T extends Record<string, unknown>>(record: T) {
  return {
    ...record,
    latitude:
      'latitude' in record && typeof record.latitude !== 'undefined'
        ? (record.latitude ?? null)
        : null,
    longitude:
      'longitude' in record && typeof record.longitude !== 'undefined'
        ? (record.longitude ?? null)
        : null,
  }
}

function ensureLegacyDatabaseCanSkipCoordinates(
  data: { latitude?: unknown; longitude?: unknown },
) {
  const hasCoordinateValue =
    typeof data.latitude === 'number' ||
    typeof data.longitude === 'number'

  if (hasCoordinateValue) {
    throw new ApiError(
      409,
      'Apply the latest database migration before saving building coordinates',
    )
  }
}

export async function listCampusBuildingsCompatible({
  where,
  orderBy,
}: {
  where?: Prisma.CampusBuildingWhereInput
  orderBy?:
    | Prisma.CampusBuildingOrderByWithRelationInput
    | Prisma.CampusBuildingOrderByWithRelationInput[]
}) {
  try {
    const records = await prisma.campusBuilding.findMany({
      where,
      orderBy,
      select: campusBuildingSelect,
    })

    return records.map((record) => withLocationDefaults(record))
  } catch (error) {
    if (!isMissingDatabaseFieldError(error)) {
      throw error
    }

    const records = await prisma.campusBuilding.findMany({
      where,
      orderBy,
      select: legacyCampusBuildingSelect,
    })

    return records.map((record) => withLocationDefaults(record))
  }
}

export async function createCampusBuildingCompatible(
  data: Prisma.CampusBuildingCreateInput & { latitude?: number; longitude?: number },
) {
  try {
    const record = await prisma.campusBuilding.create({
      data,
      select: campusBuildingSelect,
    })

    return withLocationDefaults(record)
  } catch (error) {
    if (!isMissingDatabaseFieldError(error)) {
      throw error
    }

    ensureLegacyDatabaseCanSkipCoordinates(data)
    const legacyData = { ...data }
    delete legacyData.latitude
    delete legacyData.longitude

    const record = await prisma.campusBuilding.create({
      data: legacyData,
      select: legacyCampusBuildingSelect,
    })

    return withLocationDefaults(record)
  }
}

export async function updateCampusBuildingCompatible(
  id: string,
  data: Prisma.CampusBuildingUpdateInput & { latitude?: number | null; longitude?: number | null },
) {
  try {
    const record = await prisma.campusBuilding.update({
      where: { id },
      data,
      select: campusBuildingSelect,
    })

    return withLocationDefaults(record)
  } catch (error) {
    if (!isMissingDatabaseFieldError(error)) {
      throw error
    }

    ensureLegacyDatabaseCanSkipCoordinates(data)
    const legacyData = { ...data }
    delete legacyData.latitude
    delete legacyData.longitude

    const record = await prisma.campusBuilding.update({
      where: { id },
      data: legacyData,
      select: legacyCampusBuildingSelect,
    })

    return withLocationDefaults(record)
  }
}
