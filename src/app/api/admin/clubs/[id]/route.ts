import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { hasPortalPermission } from '@/lib/auth/portalPermissions'
import {
  ApiError,
  getAuthenticatedAdmin,
  getAuthenticatedPortalUser,
  handleApiError,
  requireAnyPortalPermission,
  successResponse,
} from '@/lib/api/utils'
import { invalidateUniversityData, UNIVERSITY_DATA_TAGS } from '@/lib/server/universityData'
import { clubUpdateSchema } from '@/lib/validations/admin'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { profile } = await getAuthenticatedPortalUser()
    const { id } = await context.params
    const payload = clubUpdateSchema.parse(await request.json())
    const canManageAllClubs = hasPortalPermission(profile, 'ADMIN_TAB_CLUBS')

    if (canManageAllClubs && payload.universityId) {
      const university = await prisma.university.findUnique({
        where: { id: payload.universityId },
        select: { id: true },
      })

      if (!university) {
        throw new ApiError(404, 'University not found')
      }
    }

    let updateData = payload

    if (!canManageAllClubs) {
      requireAnyPortalPermission(profile, [
        'CAN_MANAGE_CLUB_PROFILE',
        'CAN_MANAGE_CLUB_CONTACT',
      ])

      const assignedClubIds = new Set(
        profile.managedClubs?.map((assignment) => assignment.clubId) ?? [],
      )

      if (!assignedClubIds.has(id)) {
        throw new ApiError(403, 'You can only manage clubs assigned to your account')
      }

      const canManageProfile = hasPortalPermission(profile, 'CAN_MANAGE_CLUB_PROFILE')
      const canManageContact = hasPortalPermission(profile, 'CAN_MANAGE_CLUB_CONTACT')

      if (payload.universityId) {
        throw new ApiError(403, 'You do not have permission to reassign club ownership')
      }

      const profileFieldTouched =
        payload.name !== undefined ||
        payload.category !== undefined ||
        payload.description !== undefined ||
        payload.meetingInfo !== undefined

      const contactFieldTouched =
        payload.contactEmail !== undefined ||
        payload.websiteUrl !== undefined

      if (profileFieldTouched && !canManageProfile) {
        throw new ApiError(403, 'You do not have permission to edit club details')
      }

      if (contactFieldTouched && !canManageContact) {
        throw new ApiError(403, 'You do not have permission to edit club contact details')
      }

      updateData = {
        ...(canManageProfile
          ? {
              ...(payload.name !== undefined ? { name: payload.name } : {}),
              ...(payload.category !== undefined ? { category: payload.category } : {}),
              ...(payload.description !== undefined ? { description: payload.description } : {}),
              ...(payload.meetingInfo !== undefined ? { meetingInfo: payload.meetingInfo } : {}),
            }
          : {}),
        ...(canManageContact
          ? {
              ...(payload.contactEmail !== undefined
                ? { contactEmail: payload.contactEmail }
                : {}),
              ...(payload.websiteUrl !== undefined ? { websiteUrl: payload.websiteUrl } : {}),
            }
          : {}),
      }

      if (Object.keys(updateData).length === 0) {
        throw new ApiError(400, 'No editable fields provided')
      }
    }

    const updated = await prisma.clubOrganization.update({
      where: { id },
      data: updateData,
      include: {
        university: {
          select: { id: true, name: true, slug: true },
        },
      },
    })
    invalidateUniversityData(UNIVERSITY_DATA_TAGS.clubs)

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await getAuthenticatedAdmin('ADMIN_TAB_CLUBS')
    const { id } = await context.params

    await prisma.clubOrganization.delete({ where: { id } })
    invalidateUniversityData(UNIVERSITY_DATA_TAGS.clubs)

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
