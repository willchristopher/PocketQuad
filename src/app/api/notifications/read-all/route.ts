import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'

export async function POST() {
  try {
    const { profile } = await getAuthenticatedUser()

    const result = await prisma.notification.updateMany({
      where: {
        userId: profile.id,
        read: false,
      },
      data: {
        read: true,
      },
    })

    return successResponse({ updatedCount: result.count })
  } catch (error) {
    return handleApiError(error)
  }
}
