import { prisma } from '@/lib/prisma'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  resolveParams,
  successResponse,
} from '@/lib/api/utils'

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }>  },
) {
  try {
    const { profile } = await getAuthenticatedUser()
    const { id } = await resolveParams(context)

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!notification || notification.userId !== profile.id) {
      throw new ApiError(404, 'Notification not found')
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    })

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}
