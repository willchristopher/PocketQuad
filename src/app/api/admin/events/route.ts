import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils'
import { adminEventCreateSchema } from '@/lib/validations/admin'

export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedAdmin('ADMIN_TAB_EVENTS')
    const universityId = request.nextUrl.searchParams.get('universityId') ?? undefined

    const events = await prisma.event.findMany({
      where: {
        ...(universityId ? { universityId } : {}),
      },
      include: {
        university: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: [{ date: 'asc' }],
      take: 200,
    })

    return successResponse(events)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedAdmin('ADMIN_TAB_EVENTS')
    const payload = adminEventCreateSchema.parse(await request.json())

    const university = await prisma.university.findUnique({
      where: { id: payload.universityId },
      select: { id: true },
    })

    if (!university) {
      throw new ApiError(404, 'University not found')
    }

    const event = await prisma.event.create({
      data: {
        universityId: payload.universityId,
        title: payload.title,
        description: payload.description,
        date: payload.date,
        time: payload.time,
        location: payload.location,
        category: payload.category,
        organizer: payload.organizer,
        isPublished: payload.isPublished,
      },
      include: {
        university: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    return successResponse(event, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
