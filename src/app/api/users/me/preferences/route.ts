import { NextRequest } from 'next/server'

import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'
import { readDashboardModules, writeDashboardModules } from '@/lib/dashboardPreferences'
import { updatePreferencesSchema } from '@/lib/validations'

export async function PATCH(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const rateLimit = assertRateLimit({
      key: 'users:me:preferences',
      limit: 30,
      windowMs: 10 * 60_000,
      request,
      identifier: profile.id,
      message: 'Too many preference updates. Please wait a few minutes and try again.',
    })
    const payload = updatePreferencesSchema.parse(await request.json())
    const { dashboardModules, ...preferencePayload } = payload

    const preferences = await prisma.notificationPreferences.upsert({
      where: { userId: profile.id },
      update: preferencePayload,
      create: {
        userId: profile.id,
        ...preferencePayload,
      },
    })

    if (typeof dashboardModules !== 'undefined') {
      await writeDashboardModules(profile.id, dashboardModules)
    }

    return withRateLimitHeaders(
      successResponse({
        ...preferences,
        ...(typeof dashboardModules !== 'undefined'
          ? { dashboardModules }
          : {
              dashboardModules: await readDashboardModules(profile.id),
            }),
      }),
      rateLimit,
    )
  } catch (error) {
    return handleApiError(error)
  }
}
