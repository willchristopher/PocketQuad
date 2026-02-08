import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils'
import { adminFacultyUpdateSchema } from '@/lib/validations/admin'

type RouteContext = {
  params: Promise<{ id: string }>
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/)
  const firstName = parts[0] ?? 'Faculty'
  const lastName = parts.slice(1).join(' ') || 'Member'
  return { firstName, lastName }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await getAuthenticatedAdmin()
    const { id } = await context.params
    const payload = adminFacultyUpdateSchema.parse(await request.json())

    const existing = await prisma.faculty.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!existing) {
      throw new ApiError(404, 'Faculty record not found')
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (payload.universityId) {
        const university = await tx.university.findUnique({
          where: { id: payload.universityId },
          select: { id: true },
        })

        if (!university) {
          throw new ApiError(404, 'University not found')
        }
      }

      const nextName = payload.name ?? existing.name
      const { firstName, lastName } = splitName(nextName)

      await tx.user.update({
        where: { id: existing.userId },
        data: {
          ...(payload.name ? { displayName: payload.name, firstName, lastName } : {}),
          ...(payload.email ? { email: payload.email } : {}),
          ...(payload.canPublishCampusAnnouncements !== undefined
            ? { canPublishCampusAnnouncements: payload.canPublishCampusAnnouncements }
            : {}),
          ...(payload.department ? { department: payload.department } : {}),
          ...(payload.universityId ? { universityId: payload.universityId } : {}),
        },
      })

      return tx.faculty.update({
        where: { id },
        data: {
          ...(payload.name ? { name: payload.name } : {}),
          ...(payload.email ? { email: payload.email } : {}),
          ...(payload.title ? { title: payload.title } : {}),
          ...(payload.department ? { department: payload.department } : {}),
          ...(payload.officeLocation ? { officeLocation: payload.officeLocation } : {}),
          ...(payload.officeHours ? { officeHours: payload.officeHours } : {}),
          ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
          ...(payload.bio !== undefined ? { bio: payload.bio } : {}),
          ...(payload.courses ? { courses: payload.courses } : {}),
          ...(payload.tags ? { tags: payload.tags } : {}),
          ...(payload.universityId ? { universityId: payload.universityId } : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              canPublishCampusAnnouncements: true,
            },
          },
          university: {
            select: { id: true, name: true, slug: true },
          },
        },
      })
    })

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await getAuthenticatedAdmin()
    const { id } = await context.params

    const existing = await prisma.faculty.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!existing) {
      throw new ApiError(404, 'Faculty record not found')
    }

    await prisma.faculty.delete({ where: { id } })

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
