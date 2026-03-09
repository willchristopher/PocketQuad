import { NextRequest } from 'next/server'

import { hasPortalPermission } from '@/lib/auth/portalPermissions'
import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit'
import { prisma } from '@/lib/prisma'
import { canPublishCampusAnnouncements } from '@/lib/facultyPermissions'
import {
  getAnnouncementAudienceLabel,
  listUniversityAnnouncements,
} from '@/lib/server/announcements'
import { isMissingDatabaseFieldError } from '@/lib/server/dbCompatibility'
import { createAnnouncementSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser({
      includeManagedBuildings: true,
    })

    const canPublishCampus = canPublishCampusAnnouncements(profile)
    const canManageBuildings = hasPortalPermission(profile, 'ADMIN_TAB_BUILDINGS')
    const canManageServices = hasPortalPermission(profile, 'ADMIN_TAB_SERVICES')
    const managedBuildingIds = profile.managedBuildings?.map((assignment) => assignment.buildingId) ?? []
    const universityId = profile.universityId ?? undefined

    let schemaSupportsScopedAnnouncements = true

    try {
      await prisma.announcement.findFirst({
        select: {
          scope: true,
        },
      })
    } catch (error) {
      if (!isMissingDatabaseFieldError(error)) {
        throw error
      }

      schemaSupportsScopedAnnouncements = false
    }

    const [availableBuildings, availableServices, items] = await Promise.all([
      universityId && schemaSupportsScopedAnnouncements
        ? prisma.campusBuilding.findMany({
            where: canManageBuildings
              ? { universityId }
              : {
                  universityId,
                  id: {
                    in: managedBuildingIds.length > 0 ? managedBuildingIds : ['__none__'],
                  },
                },
            select: {
              id: true,
              name: true,
              type: true,
            },
            orderBy: { name: 'asc' },
          })
        : Promise.resolve([]),
      universityId && canManageServices && schemaSupportsScopedAnnouncements
        ? prisma.campusService.findMany({
            where: { universityId },
            select: {
              id: true,
              name: true,
              location: true,
            },
            orderBy: { name: 'asc' },
          })
        : Promise.resolve([]),
      listUniversityAnnouncements(universityId, 12),
    ])

    return successResponse({
      canPublish: canPublishCampus,
      permissions: {
        canPublishCampus,
        canPublishBuildings:
          schemaSupportsScopedAnnouncements &&
          (canManageBuildings || managedBuildingIds.length > 0),
        canPublishServices: schemaSupportsScopedAnnouncements && canManageServices,
      },
      availableBuildings,
      availableServices,
      items,
      schemaSupportsScopedAnnouncements,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser({
      includeManagedBuildings: true,
    })
    const rateLimit = assertRateLimit({
      key: 'announcements:create',
      limit: 10,
      windowMs: 10 * 60_000,
      request,
      identifier: profile.id,
      message: 'Too many announcement publish attempts. Please wait a few minutes and try again.',
    })

    const payload = createAnnouncementSchema.parse(await request.json())
    const canManageBuildings = hasPortalPermission(profile, 'ADMIN_TAB_BUILDINGS')
    const canManageServices = hasPortalPermission(profile, 'ADMIN_TAB_SERVICES')
    const canPublishCampus = canPublishCampusAnnouncements(profile)
    const managedBuildingIds = profile.managedBuildings?.map((assignment) => assignment.buildingId) ?? []
    let schemaSupportsScopedAnnouncements = true

    try {
      await prisma.announcement.findFirst({
        select: {
          scope: true,
        },
      })
    } catch (error) {
      if (!isMissingDatabaseFieldError(error)) {
        throw error
      }

      schemaSupportsScopedAnnouncements = false
    }

    if (payload.scope === 'CAMPUS' && !canPublishCampus) {
      throw new ApiError(403, 'You do not have permission to publish campus announcements')
    }

    if (!schemaSupportsScopedAnnouncements && payload.scope !== 'CAMPUS') {
      throw new ApiError(
        409,
        'Building and service announcements are not available until the latest database schema is applied',
      )
    }

    if (payload.scope === 'BUILDING' && !canManageBuildings && !managedBuildingIds.includes(payload.buildingId!)) {
      throw new ApiError(403, 'You do not have permission to publish building announcements for that building')
    }

    if (payload.scope === 'SERVICE' && !canManageServices) {
      throw new ApiError(403, 'You do not have permission to publish service announcements')
    }

    if (!profile.universityId) {
      throw new ApiError(400, 'A university association is required to publish announcements')
    }

    const [building, service] = await Promise.all([
      payload.scope === 'BUILDING'
        ? prisma.campusBuilding.findFirst({
            where: {
              id: payload.buildingId,
              universityId: profile.universityId,
            },
            select: {
              id: true,
              name: true,
            },
          })
        : Promise.resolve(null),
      payload.scope === 'SERVICE'
        ? prisma.campusService.findFirst({
            where: {
              id: payload.serviceId,
              universityId: profile.universityId,
            },
            select: {
              id: true,
              name: true,
            },
          })
        : Promise.resolve(null),
    ])

    if (payload.scope === 'BUILDING' && !building) {
      throw new ApiError(404, 'Building not found')
    }

    if (payload.scope === 'SERVICE' && !service) {
      throw new ApiError(404, 'Service not found')
    }

    let announcement

    try {
      announcement = await prisma.announcement.create({
        data: {
          universityId: profile.universityId,
          createdById: profile.id,
          scope: payload.scope,
          buildingId: payload.scope === 'BUILDING' ? payload.buildingId : null,
          serviceId: payload.scope === 'SERVICE' ? payload.serviceId : null,
          title: payload.title,
          message: payload.message,
          linkUrl: payload.linkUrl,
          expiresAt: payload.expiresAt,
        },
        include: {
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
      })
    } catch (error) {
      if (!isMissingDatabaseFieldError(error)) {
        throw error
      }

      schemaSupportsScopedAnnouncements = false

      if (payload.scope !== 'CAMPUS') {
        throw new ApiError(
          409,
          'Scoped announcements are not available until the latest database schema is applied',
        )
      }

      announcement = await prisma.announcement.create({
        data: {
          title: payload.title,
          message: payload.message,
          linkUrl: payload.linkUrl,
        },
      }).then((item) => ({
        ...item,
        scope: 'CAMPUS' as const,
        building: null,
        service: null,
      }))
    }

    const recipients = await prisma.user.findMany({
      where: {
        id: {
          not: profile.id,
        },
        universityId: profile.universityId,
      },
      select: {
        id: true,
      },
    })

    const audienceLabel = getAnnouncementAudienceLabel(announcement)

    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: recipients.map((recipient) => ({
          userId: recipient.id,
          type: 'ANNOUNCEMENT',
          title: announcement.title,
          message: `${audienceLabel}: ${announcement.message}`,
          actionUrl:
            announcement.linkUrl ??
            (announcement.scope === 'BUILDING' ? '/campus-map' : '/notifications'),
          actionLabel: announcement.linkUrl ? 'Open link' : 'View details',
        })),
      })
    }

    return withRateLimitHeaders(
      successResponse(
        {
          ...announcement,
          audienceLabel,
          notifiedCount: recipients.length,
          schemaSupportsScopedAnnouncements,
        },
        201,
      ),
      rateLimit,
    )
  } catch (error) {
    return handleApiError(error)
  }
}
