import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import {
  ApiError,
  getAuthenticatedAdmin,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'
import { ALL_UNIVERSITY_DATA_TAGS, invalidateUniversityData } from '@/lib/server/universityData'
import { universityUpdateSchema } from '@/lib/validations/admin'
import { slugifyUniversityName } from '@/lib/university'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await getAuthenticatedAdmin('ADMIN_TAB_UNIVERSITIES')
    const { id } = await context.params
    const payload = universityUpdateSchema.parse(await request.json())

    const updated = await prisma.university.update({
      where: { id },
      data: {
        ...payload,
        ...(payload.slug
          ? { slug: payload.slug }
          : payload.name
            ? { slug: slugifyUniversityName(payload.name) }
            : {}),
      },
    })
    invalidateUniversityData(...ALL_UNIVERSITY_DATA_TAGS)

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await getAuthenticatedAdmin('ADMIN_TAB_UNIVERSITIES')
    const { id } = await context.params

    const target = await prisma.university.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            faculties: true,
            events: true,
            buildings: true,
            resourceLinks: true,
            services: true,
            clubs: true,
          },
        },
      },
    })

    if (!target) {
      throw new ApiError(404, 'University not found')
    }

    if (target._count.users > 0) {
      throw new ApiError(
        409,
        'Cannot delete a university that still has users. Reassign users first.',
      )
    }

    await prisma.university.delete({ where: { id } })
    invalidateUniversityData(...ALL_UNIVERSITY_DATA_TAGS)

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
