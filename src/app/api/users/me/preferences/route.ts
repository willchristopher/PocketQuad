import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'
import { updatePreferencesSchema } from '@/lib/validations'

export async function PATCH(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const payload = updatePreferencesSchema.parse(await request.json())

    const preferences = await prisma.notificationPreferences.upsert({
      where: { userId: profile.id },
      update: payload,
      create: {
        userId: profile.id,
        ...payload,
      },
    })

    return successResponse(preferences)
  } catch (error) {
    return handleApiError(error)
  }
}
