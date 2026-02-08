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

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required')
    }

    const { id } = await resolveParams(context)

    const officeHour = await prisma.officeHour.findUnique({
      where: { id },
      select: { id: true, userId: true, isActive: true },
    })

    if (!officeHour) {
      throw new ApiError(404, 'Office hour slot not found')
    }

    if (officeHour.userId !== profile.id) {
      throw new ApiError(403, 'You can only toggle your own office hour slots')
    }

    const updated = await prisma.officeHour.update({
      where: { id },
      data: {
        isActive: !officeHour.isActive,
      },
    })

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}
