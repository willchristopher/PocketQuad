import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'
import { updateProfileSchema } from '@/lib/validations'

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser()
    return successResponse(profile)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const payload = updateProfileSchema.parse(await request.json())

    const updated = await prisma.user.update({
      where: { id: profile.id },
      data: payload,
      include: {
        notificationPreferences: true,
      },
    })

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}
