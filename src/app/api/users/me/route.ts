import { NextRequest } from 'next/server'

import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit'
import { attachDashboardModules } from '@/lib/dashboardPreferences'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'
import { updateProfileSchema } from '@/lib/validations'

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser({
      includePreferences: true,
      includeUniversity: true,
    })

    const fullProfile = await prisma.user.findUnique({
      where: { id: profile.id },
      include: {
        notificationPreferences: true,
        university: {
          select: { id: true, name: true, domain: true },
        },
        managedClubs: {
          select: {
            clubId: true,
            club: {
              select: {
                id: true,
                universityId: true,
                name: true,
              },
            },
          },
        },
      },
    })

    return successResponse(await attachDashboardModules(fullProfile))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const rateLimit = assertRateLimit({
      key: 'users:me:patch',
      limit: 20,
      windowMs: 10 * 60_000,
      request,
      identifier: profile.id,
      message: 'Too many profile update attempts. Please wait a few minutes and try again.',
    })
    const payload = updateProfileSchema.parse(await request.json())

    const updated = await prisma.user.update({
      where: { id: profile.id },
      data: payload,
      include: {
        notificationPreferences: true,
      },
    })

    return withRateLimitHeaders(successResponse(updated), rateLimit)
  } catch (error) {
    return handleApiError(error)
  }
}
