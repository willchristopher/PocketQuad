import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import {
  ApiError,
  getAuthenticatedAdmin,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'
import type { AdminAccessLevel } from '@/lib/auth/portalPermissions'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { adminUserUpdateSchema } from '@/lib/validations/admin'

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
    throw new ApiError(403, 'You can only manage users in your own university')
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { profile } = await getAuthenticatedAdmin('ADMIN_TAB_USERS')
    const { id } = await context.params
    const payload = adminUserUpdateSchema.parse(await request.json())
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
      },
    })

    if (!target) {
      throw new ApiError(404, 'User not found')
    }

    ensureScopedToUniversity(isOwner, profile.universityId, target.universityId)

    // Prevent non-owners from modifying owner accounts
    if (!isOwner && target.adminAccessLevel === 'OWNER') {
      throw new ApiError(403, 'You cannot modify an owner account')
    }

    // Prevent changing your own role/access level
    if (
      target.id === profile.id &&
      (payload.role !== undefined || payload.adminAccessLevel !== undefined)
    ) {
      throw new ApiError(400, 'You cannot change your own role or access level')
    }

    const firstName = payload.firstName ?? target.firstName
    const lastName = payload.lastName ?? target.lastName
    const role = payload.role ?? target.role

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(payload.firstName !== undefined ? { firstName } : {}),
        ...(payload.lastName !== undefined ? { lastName } : {}),
        ...(payload.firstName !== undefined || payload.lastName !== undefined
          ? { displayName: `${firstName} ${lastName}`.trim() }
          : {}),
        ...(payload.email !== undefined ? { email: payload.email } : {}),
        ...(payload.role !== undefined ? { role } : {}),
        ...(payload.major !== undefined ? { major: payload.major } : {}),
        ...(payload.department !== undefined
          ? { department: payload.department }
          : {}),
        ...(payload.year !== undefined ? { year: payload.year } : {}),
        ...(payload.bio !== undefined ? { bio: payload.bio } : {}),
        ...(payload.adminAccessLevel !== undefined
          ? { adminAccessLevel: payload.adminAccessLevel }
          : {}),
        ...(payload.onboardingComplete !== undefined
          ? { onboardingComplete: payload.onboardingComplete }
          : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        role: true,
        adminAccessLevel: true,
        major: true,
        department: true,
        year: true,
        emailVerified: true,
        onboardingComplete: true,
        createdAt: true,
        lastLogin: true,
        university: { select: { id: true, name: true, slug: true } },
      },
    })

    // Sync metadata to Supabase if relevant fields changed
    if (
      target.supabaseId &&
      (payload.firstName !== undefined ||
        payload.lastName !== undefined ||
        payload.role !== undefined)
    ) {
      const supabase = createSupabaseAdminClient()
      const { error } = await supabase.auth.admin.updateUserById(
        target.supabaseId,
        {
          user_metadata: { firstName, lastName, role },
        },
      )
      if (error) {
        console.error(
          'Supabase auth metadata sync failed after user update:',
          error.message,
        )
      }
    }

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { profile } = await getAuthenticatedAdmin('ADMIN_TAB_USERS')
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
        adminAccessLevel: true,
      },
    })

    if (!target) {
      throw new ApiError(404, 'User not found')
    }

    ensureScopedToUniversity(isOwner, profile.universityId, target.universityId)

    // Prevent non-owners from deleting owner accounts
    if (!isOwner && target.adminAccessLevel === 'OWNER') {
      throw new ApiError(403, 'You cannot delete an owner account')
    }

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
