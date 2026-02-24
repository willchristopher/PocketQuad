import type { CampusServiceStatus, ResourceLinkCategory } from '@prisma/client'
import { revalidateTag, unstable_cache } from 'next/cache'

import { prisma } from '@/lib/prisma'

export const UNIVERSITY_DATA_TAGS = {
  buildings: 'university-buildings',
  clubs: 'university-clubs',
  faculty: 'university-faculty',
  resourceLinks: 'university-resource-links',
  services: 'university-services',
  theme: 'university-theme',
} as const

type UniversityDataTag = (typeof UNIVERSITY_DATA_TAGS)[keyof typeof UNIVERSITY_DATA_TAGS]

export const ALL_UNIVERSITY_DATA_TAGS = Object.values(UNIVERSITY_DATA_TAGS)

const UNIVERSITY_DATA_TTL_SECONDS = 30

export function invalidateUniversityData(...tags: UniversityDataTag[]) {
  for (const tag of tags) {
    revalidateTag(tag, 'max')
  }
}

const getCampusServicesCachedInternal = unstable_cache(
  async (universityId: string | null, status: CampusServiceStatus | null) => {
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
    })
  },
  ['campus-services'],
  { revalidate: UNIVERSITY_DATA_TTL_SECONDS, tags: [UNIVERSITY_DATA_TAGS.services] },
)

const getResourceLinksCachedInternal = unstable_cache(
  async (
    universityId: string | null,
    category: ResourceLinkCategory | null,
    query: string | null,
  ) => {
    return prisma.campusResourceLink.findMany({
      where: {
        ...(universityId ? { universityId } : {}),
        ...(category ? { category } : {}),
        ...(query
          ? {
              OR: [
                { label: { contains: query, mode: 'insensitive' as const } },
                { description: { contains: query, mode: 'insensitive' as const } },
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
    })
  },
  ['campus-resource-links'],
  { revalidate: UNIVERSITY_DATA_TTL_SECONDS, tags: [UNIVERSITY_DATA_TAGS.resourceLinks] },
)

const getClubsCachedInternal = unstable_cache(
  async (universityId: string | null, category: string | null, query: string | null) => {
    return prisma.clubOrganization.findMany({
      where: {
        ...(universityId ? { universityId } : {}),
        ...(category ? { category } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' as const } },
                { description: { contains: query, mode: 'insensitive' as const } },
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
    })
  },
  ['club-organizations'],
  { revalidate: UNIVERSITY_DATA_TTL_SECONDS, tags: [UNIVERSITY_DATA_TAGS.clubs] },
)

const getBuildingsCachedInternal = unstable_cache(
  async (universityId: string | null, query: string | null) => {
    return prisma.campusBuilding.findMany({
      where: {
        ...(universityId ? { universityId } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' as const } },
                { address: { contains: query, mode: 'insensitive' as const } },
                { type: { contains: query, mode: 'insensitive' as const } },
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
    })
  },
  ['campus-buildings'],
  { revalidate: UNIVERSITY_DATA_TTL_SECONDS, tags: [UNIVERSITY_DATA_TAGS.buildings] },
)

const getFacultyCachedInternal = unstable_cache(
  async (
    universityId: string | null,
    department: string | null,
    query: string | null,
    viewerId: string,
  ) => {
    const faculty = await prisma.faculty.findMany({
      where: {
        ...(universityId ? { universityId } : {}),
        ...(department ? { department } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' as const } },
                { title: { contains: query, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
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
    })

    return faculty.map((item) => ({
      ...item,
      isFavorited: item.favorites.length > 0,
    }))
  },
  ['faculty-directory'],
  { revalidate: UNIVERSITY_DATA_TTL_SECONDS, tags: [UNIVERSITY_DATA_TAGS.faculty] },
)

const getUniversityThemeCachedInternal = unstable_cache(
  async (universityId: string) => {
    return prisma.university.findUnique({
      where: { id: universityId },
      select: {
        id: true,
        name: true,
        slug: true,
        themeMainColor: true,
        themeAccentColor: true,
      },
    })
  },
  ['university-theme'],
  { revalidate: UNIVERSITY_DATA_TTL_SECONDS, tags: [UNIVERSITY_DATA_TAGS.theme] },
)

export function getCampusServicesCached(
  universityId: string | undefined,
  status: CampusServiceStatus | undefined,
) {
  return getCampusServicesCachedInternal(universityId ?? null, status ?? null)
}

export function getResourceLinksCached(
  universityId: string | undefined,
  category: ResourceLinkCategory | undefined,
  query: string | undefined,
) {
  return getResourceLinksCachedInternal(universityId ?? null, category ?? null, query ?? null)
}

export function getClubsCached(
  universityId: string | undefined,
  category: string | undefined,
  query: string | undefined,
) {
  return getClubsCachedInternal(universityId ?? null, category ?? null, query ?? null)
}

export function getBuildingsCached(universityId: string | undefined, query: string | undefined) {
  return getBuildingsCachedInternal(universityId ?? null, query ?? null)
}

export function getFacultyCached(
  universityId: string | undefined,
  department: string | undefined,
  query: string | undefined,
  viewerId: string,
) {
  return getFacultyCachedInternal(
    universityId ?? null,
    department ?? null,
    query ?? null,
    viewerId,
  )
}

export function getUniversityThemeCached(universityId: string) {
  return getUniversityThemeCachedInternal(universityId)
}
