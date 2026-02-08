import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createDeadlineSchema } from '@/lib/validations'
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'

export async function GET(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const upcoming = request.nextUrl.searchParams.get('upcoming') === 'true'

    const items = await prisma.deadline.findMany({
      where: {
        userId: profile.id,
        ...(upcoming
          ? {
              dueDate: {
                gte: new Date(),
              },
            }
          : {}),
      },
      orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }],
    })

    return successResponse(items)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const payload = createDeadlineSchema.parse(await request.json())

    const deadline = await prisma.deadline.create({
      data: {
        userId: profile.id,
        title: payload.title,
        course: payload.course,
        dueDate: payload.dueDate,
        priority: payload.priority,
        notes: payload.notes,
      },
    })

    return successResponse(deadline, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
