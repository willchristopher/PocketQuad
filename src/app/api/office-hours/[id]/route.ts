import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createOfficeHourSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  resolveParams,
  successResponse,
} from '@/lib/api/utils'

const updateOfficeHourSchema = createOfficeHourSchema.partial()

async function getOwnedOfficeHour(id: string, userId: string) {
  const officeHour = await prisma.officeHour.findUnique({
    where: { id },
  })

  if (!officeHour) {
    throw new ApiError(404, 'Office hour slot not found')
  }

  if (officeHour.userId !== userId) {
    throw new ApiError(403, 'You can only modify your own office hour slots')
  }

  return officeHour
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }>  },
) {
  try {
    const { profile } = await getAuthenticatedUser()

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required')
    }

    const { id } = await resolveParams(context)
    await getOwnedOfficeHour(id, profile.id)

    const payload = updateOfficeHourSchema.parse(await request.json())

    const updated = await prisma.officeHour.update({
      where: { id },
      data: payload,
    })

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }>  },
) {
  try {
    const { profile } = await getAuthenticatedUser()

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required')
    }

    const { id } = await resolveParams(context)
    await getOwnedOfficeHour(id, profile.id)

    await prisma.officeHour.delete({
      where: { id },
    })

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
