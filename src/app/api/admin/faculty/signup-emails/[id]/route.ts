import { NextRequest } from 'next/server'
import type { AdminAccessLevel } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

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

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { profile } = await getAuthenticatedAdmin('ADMIN_TAB_FACULTY')
    const isOwner = isOwnerAccount(profile)
    const { id } = await context.params

    const existing = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        universityId: true,
        role: true,
        supabaseId: true,
        facultyProfile: {
          select: { id: true },
        },
      },
    })

    if (!existing || existing.role !== 'FACULTY') {
      throw new ApiError(404, 'Faculty signup email record not found')
    }

    if (!isOwner && existing.universityId !== profile.universityId) {
      throw new ApiError(
        403,
        'You can only remove faculty signup emails for your own university',
      )
    }

    if (existing.facultyProfile) {
      throw new ApiError(
        409,
        'This faculty email is already linked to a faculty profile and cannot be removed here',
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    if (existing.supabaseId) {
      const supabaseAdmin = createSupabaseAdminClient()
      await supabaseAdmin.auth.admin.deleteUser(existing.supabaseId).catch(() => undefined)
    }

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
