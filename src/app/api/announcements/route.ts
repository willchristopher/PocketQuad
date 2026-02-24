import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { canPublishCampusAnnouncements } from '@/lib/facultyPermissions'
import { createAnnouncementSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser()
    const canPublish = canPublishCampusAnnouncements(profile)

    const items = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return successResponse({
      canPublish,
      items,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()

    if (!canPublishCampusAnnouncements(profile)) {
      throw new ApiError(403, 'You do not have permission to publish campus announcements')
    }

    const payload = createAnnouncementSchema.parse(await request.json())

    const announcement = await prisma.announcement.create({
      data: {
        title: payload.title,
        message: payload.message,
        linkUrl: payload.linkUrl,
      },
    })

    const recipients = await prisma.user.findMany({
      where: {
        id: {
          not: profile.id,
        },
        ...(profile.universityId ? { universityId: profile.universityId } : {}),
      },
      select: {
        id: true,
      },
    })

    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: recipients.map((recipient) => ({
          userId: recipient.id,
          type: 'ANNOUNCEMENT',
          title: announcement.title,
          message: announcement.message,
          actionUrl: announcement.linkUrl ?? '/notifications',
          actionLabel: announcement.linkUrl ? 'Open link' : 'View details',
        })),
      })
    }

    return successResponse({ ...announcement, notifiedCount: recipients.length }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
