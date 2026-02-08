import { NextRequest } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { createDeadlineSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  resolveParams,
  successResponse,
} from '@/lib/api/utils'

const updateDeadlineSchema = createDeadlineSchema.partial().extend({
  completed: z.boolean().optional(),
})

async function getOwnedDeadline(id: string, userId: string) {
  const deadline = await prisma.deadline.findUnique({
    where: { id },
  })

  if (!deadline) {
    throw new ApiError(404, 'Deadline not found')
  }

  if (deadline.userId !== userId) {
    throw new ApiError(403, 'You can only manage your own deadlines')
  }

  return deadline
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }>  },
) {
  try {
    const { profile } = await getAuthenticatedUser()
    const { id } = await resolveParams(context)
    const payload = updateDeadlineSchema.parse(await request.json())

    await getOwnedDeadline(id, profile.id)

    const updated = await prisma.deadline.update({
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
    const { id } = await resolveParams(context)

    await getOwnedDeadline(id, profile.id)

    await prisma.deadline.delete({
      where: { id },
    })

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
