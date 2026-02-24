import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import {
  ApiError,
  getAuthenticatedAdmin,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'
import {
  dedupePermissions,
  getDefaultPermissionsForAccessLevel,
  type AdminAccessLevel,
  type PortalPermission,
} from '@/lib/auth/portalPermissions'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { adminPortalAccountUpdateSchema } from '@/lib/validations/admin'

type RouteContext = {
  params: Promise<{ id: string }>
}

function isOwnerAccount(profile: {
  role: 'STUDENT' | 'FACULTY' | 'ADMIN'
  adminAccessLevel: AdminAccessLevel | null
}) {
  return (
    profile.adminAccessLevel === 'OWNER' ||
    (profile.role === 'ADMIN' && profile.adminAccessLevel == null)
  )
}

function ensureScopedToUniversity(
  isOwner: boolean,
  actorUniversityId: string | null,
  targetUniversityId: string | null,
) {
  if (isOwner) return
  if (!actorUniversityId || actorUniversityId !== targetUniversityId) {
    throw new ApiError(403, 'You can only manage accounts in your own university')
  }
}

function getNextPermissions(args: {
  targetPermissions: PortalPermission[]
  nextAccessLevel: AdminAccessLevel | null
  requestedPermissions?: PortalPermission[]
  accessLevelChanged: boolean
}) {
  if (args.requestedPermissions) {
    return dedupePermissions([
      ...args.requestedPermissions,
      ...(args.nextAccessLevel ? ['ADMIN_PORTAL_ACCESS' as const] : []),
    ])
  }

  if (args.accessLevelChanged) {
    if (!args.nextAccessLevel) return []
    return getDefaultPermissionsForAccessLevel(args.nextAccessLevel)
  }

  return dedupePermissions([
    ...args.targetPermissions,
    ...(args.nextAccessLevel ? ['ADMIN_PORTAL_ACCESS' as const] : []),
  ])
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { profile } = await getAuthenticatedAdmin('ADMIN_TAB_IT_ACCOUNTS')
    const { id } = await context.params
    const payload = adminPortalAccountUpdateSchema.parse(await request.json())
    const isOwner = isOwnerAccount(profile)

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        supabaseId: true,
        universityId: true,
        firstName: true,
        lastName: true,
        role: true,
        adminAccessLevel: true,
        portalPermissions: true,
      },
    })

    if (!target) {
      throw new ApiError(404, 'Account not found')
    }

    ensureScopedToUniversity(isOwner, profile.universityId, target.universityId)

    if (
      target.id === profile.id &&
      (payload.accessLevel !== undefined ||
        payload.portalPermissions !== undefined ||
        payload.role !== undefined)
    ) {
      throw new ApiError(
        400,
        'You cannot change your own role or permission set from this screen',
      )
    }

    const nextAccessLevel =
      payload.accessLevel !== undefined ? payload.accessLevel : target.adminAccessLevel
    const accessLevelChanged = payload.accessLevel !== undefined
    let nextPermissions = getNextPermissions({
      targetPermissions: target.portalPermissions,
      nextAccessLevel,
      requestedPermissions: payload.portalPermissions,
      accessLevelChanged,
    })

    if (payload.canPublishCampusAnnouncements !== undefined) {
      nextPermissions = payload.canPublishCampusAnnouncements
        ? dedupePermissions([...nextPermissions, 'CAN_PUBLISH_ANNOUNCEMENTS'])
        : nextPermissions.filter(
            (permission) => permission !== 'CAN_PUBLISH_ANNOUNCEMENTS',
          )
    }

    const canPublishCampusAnnouncements =
      payload.canPublishCampusAnnouncements ??
      nextPermissions.includes('CAN_PUBLISH_ANNOUNCEMENTS')

    const managedClubIds = payload.managedClubIds
      ? Array.from(new Set(payload.managedClubIds))
      : undefined

    if (managedClubIds && managedClubIds.length > 0) {
      const clubs = await prisma.clubOrganization.findMany({
        where: { id: { in: managedClubIds } },
        select: { id: true, universityId: true },
      })

      if (clubs.length !== managedClubIds.length) {
        throw new ApiError(404, 'One or more selected clubs were not found')
      }

      if (clubs.some((club) => club.universityId !== target.universityId)) {
        throw new ApiError(400, 'Managed clubs must belong to the account university')
      }
    }

    const role = payload.role ?? target.role
    const firstName = payload.firstName ?? target.firstName
    const lastName = payload.lastName ?? target.lastName

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          ...(payload.firstName !== undefined ? { firstName } : {}),
          ...(payload.lastName !== undefined ? { lastName } : {}),
          ...(payload.firstName !== undefined || payload.lastName !== undefined
            ? { displayName: `${firstName} ${lastName}`.trim() }
            : {}),
          ...(payload.role !== undefined ? { role } : {}),
          ...(payload.accessLevel !== undefined ? { adminAccessLevel: nextAccessLevel } : {}),
          ...(payload.portalPermissions !== undefined || payload.accessLevel !== undefined
            ? { portalPermissions: nextPermissions }
            : {}),
          ...(payload.canPublishCampusAnnouncements !== undefined ||
          payload.portalPermissions !== undefined ||
          payload.accessLevel !== undefined
            ? { canPublishCampusAnnouncements }
            : {}),
        },
      })

      if (managedClubIds) {
        await tx.clubManagerAssignment.deleteMany({
          where: { userId: user.id },
        })

        if (managedClubIds.length > 0) {
          await tx.clubManagerAssignment.createMany({
            data: managedClubIds.map((clubId) => ({ userId: user.id, clubId })),
            skipDuplicates: true,
          })
        }
      }

      return tx.user.findUnique({
        where: { id: user.id },
        include: {
          university: { select: { id: true, name: true, slug: true } },
          managedClubs: {
            select: {
              clubId: true,
              club: {
                select: {
                  id: true,
                  name: true,
                  universityId: true,
                },
              },
            },
          },
        },
      })
    })

    if (
      target.supabaseId &&
      (payload.firstName !== undefined ||
        payload.lastName !== undefined ||
        payload.role !== undefined)
    ) {
      const supabase = createSupabaseAdminClient()
      const { error } = await supabase.auth.admin.updateUserById(target.supabaseId, {
        user_metadata: {
          firstName,
          lastName,
          role,
        },
      })

      if (error) {
        console.error('Supabase auth metadata sync failed after account update:', error.message)
      }
    }

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { profile } = await getAuthenticatedAdmin('ADMIN_TAB_IT_ACCOUNTS')
    const { id } = await context.params
    const isOwner = isOwnerAccount(profile)

    if (id === profile.id) {
      throw new ApiError(400, 'You cannot delete your own account')
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        supabaseId: true,
        universityId: true,
      },
    })

    if (!target) {
      throw new ApiError(404, 'Account not found')
    }

    ensureScopedToUniversity(isOwner, profile.universityId, target.universityId)

    await prisma.user.delete({ where: { id } })

    if (target.supabaseId) {
      const supabase = createSupabaseAdminClient()
      await supabase.auth.admin.deleteUser(target.supabaseId)
    }

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
