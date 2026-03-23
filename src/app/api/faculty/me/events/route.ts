import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createFacultyOwnedEvent, getFacultyEventOwner } from '@/lib/server/facultyEvents'
import { createEventSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser({
      includeManagedBuildings: true,
    })

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required')
    }

    await getFacultyEventOwner(profile.id)

    const events = await prisma.event.findMany({
      where: {
        organizerId: profile.id,
      },
      include: {
        building: {
          select: {
            id: true,
            name: true,
            address: true,
            type: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    })

    return successResponse(events)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser({
      includeManagedBuildings: true,
    })

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required')
    }

    const payload = createEventSchema.parse(await request.json())
    const result = await createFacultyOwnedEvent({
      profile,
      payload,
    })

    return successResponse(
      {
        ...result.event,
        notifiedCount: result.notifiedCount,
      },
      201,
    )
  } catch (error) {
    return handleApiError(error)
  }
}
