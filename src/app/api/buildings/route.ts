import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'
import { getBuildingsCached } from '@/lib/server/universityData'

export async function GET(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const query = request.nextUrl.searchParams.get('search')?.trim()
    const requestedUniversityId = request.nextUrl.searchParams.get('universityId') ?? undefined
    const universityId =
      profile.role === 'ADMIN' && requestedUniversityId
        ? requestedUniversityId
        : profile.universityId ?? undefined

    const buildings = await getBuildingsCached(universityId, query)
    const buildingIds = buildings.map((building) => building.id)
    const now = new Date()

    const [announcements, events] = buildingIds.length
      ? await Promise.all([
          prisma.announcement.findMany({
            where: {
              universityId,
              scope: 'BUILDING',
              buildingId: {
                in: buildingIds,
              },
              isActive: true,
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: now } },
              ],
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
          }),
        ])
      : [[], []]

    const announcementsByBuilding = new Map<string, typeof announcements>()
    for (const item of announcements) {
      if (!item.buildingId) continue
      const current = announcementsByBuilding.get(item.buildingId) ?? []
      if (current.length < 3) {
        current.push(item)
        announcementsByBuilding.set(item.buildingId, current)
      }
    }

    const eventsByBuilding = new Map<string, typeof events>()
    for (const item of events) {
      if (!item.buildingId) continue
      const current = eventsByBuilding.get(item.buildingId) ?? []
      if (current.length < 3) {
        current.push(item)
        eventsByBuilding.set(item.buildingId, current)
      }
    }

    return successResponse(
      buildings.map((building) => ({
        ...building,
        announcements: announcementsByBuilding.get(building.id) ?? [],
        upcomingEvents: eventsByBuilding.get(building.id) ?? [],
      })),
    )
  } catch (error) {
    return handleApiError(error)
  }
}
