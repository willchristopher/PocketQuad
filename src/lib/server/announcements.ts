import { prisma } from '@/lib/prisma'
import { isMissingDatabaseFieldError } from '@/lib/server/dbCompatibility'

export function getAnnouncementAudienceLabel(announcement: {
  scope: 'CAMPUS' | 'BUILDING' | 'SERVICE'
  building: { name: string } | null
  service: { name: string } | null
}) {
  if (announcement.scope === 'BUILDING') {
    return announcement.building?.name ?? 'Building update'
  }

  if (announcement.scope === 'SERVICE') {
    return announcement.service?.name ?? 'Service update'
  }

  return 'Whole campus'
}

export async function listUniversityAnnouncements(
  universityId: string | undefined,
  take = 10,
) {
  if (!universityId) {
    return []
  }

  let announcements: Array<{
    id: string
    title: string
    message: string
    linkUrl: string | null
    expiresAt: Date | null
    scope: 'CAMPUS' | 'BUILDING' | 'SERVICE'
    createdAt: Date
    createdBy: { displayName: string } | null
    building: { id: string; name: string } | null
    service: { id: string; name: string } | null
  }>

  const now = new Date()

  try {
    announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        universityId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
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
    })
  } catch (error) {
    if (!isMissingDatabaseFieldError(error)) {
      throw error
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
    }).then((items) =>
      items.map((item) => ({
        ...item,
        expiresAt: null,
        scope: 'CAMPUS' as const,
        createdBy: null,
        building: null,
        service: null,
      })),
    )
  }

  return announcements.map((announcement) => ({
    ...announcement,
    authorName: announcement.createdBy?.displayName ?? null,
    audienceLabel: getAnnouncementAudienceLabel(announcement),
  }))
}
