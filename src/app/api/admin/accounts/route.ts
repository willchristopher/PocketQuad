import crypto from 'node:crypto'
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
} from '@/lib/auth/portalPermissions'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { adminPortalAccountCreateSchema } from '@/lib/validations/admin'

function isOwnerAccount(profile: {
  role: 'STUDENT' | 'FACULTY' | 'ADMIN'
  adminAccessLevel: AdminAccessLevel | null
}) {
  return (
    profile.adminAccessLevel === 'OWNER' ||
    (profile.role === 'ADMIN' && profile.adminAccessLevel == null)
  )
}

function getRoleForAccessLevel(
  accessLevel: AdminAccessLevel,
  explicitRole?: 'STUDENT' | 'FACULTY' | 'ADMIN',
) {
  if (explicitRole) return explicitRole
  if (accessLevel === 'CLUB_PRESIDENT') return 'STUDENT'
  return 'ADMIN'
}

function buildSecurePassword() {
  return `MyQuad-${crypto.randomUUID()}-A1!`
}

export async function GET(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedAdmin('ADMIN_TAB_IT_ACCOUNTS')
    const isOwner = isOwnerAccount(profile)
    const requestedUniversityId = request.nextUrl.searchParams.get('universityId') ?? undefined
    const search = request.nextUrl.searchParams.get('search')?.trim()

    if (!isOwner && requestedUniversityId && requestedUniversityId !== profile.universityId) {
      throw new ApiError(403, 'You can only view accounts for your own university')
    }

    const scopedUniversityId = isOwner
      ? requestedUniversityId
      : profile.universityId ?? requestedUniversityId

    const accounts = await prisma.user.findMany({
      where: {
        ...(scopedUniversityId ? { universityId: scopedUniversityId } : {}),
        AND: [
          {
            OR: [
              { role: 'ADMIN' },
              { adminAccessLevel: { not: null } },
              { portalPermissions: { has: 'ADMIN_PORTAL_ACCESS' } },
            ],
          },
          ...(search
            ? [
                {
                  OR: [
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { displayName: { contains: search, mode: 'insensitive' as const } },
                    { firstName: { contains: search, mode: 'insensitive' as const } },
                    { lastName: { contains: search, mode: 'insensitive' as const } },
                  ],
                },
              ]
            : []),
        ],
      },
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
      orderBy: [{ adminAccessLevel: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    })

    return successResponse(accounts)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedAdmin('ADMIN_TAB_IT_ACCOUNTS')
    const payload = adminPortalAccountCreateSchema.parse(await request.json())
    const isOwner = isOwnerAccount(profile)

    if (!isOwner && payload.universityId !== profile.universityId) {
      throw new ApiError(403, 'You can only create accounts for your own university')
    }

    const university = await prisma.university.findUnique({
      where: { id: payload.universityId },
      select: { id: true, name: true, slug: true },
    })

    if (!university) {
      throw new ApiError(404, 'University not found')
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true },
    })

    if (existingUser) {
      throw new ApiError(409, 'Email is already in use')
    }

    const basePermissions = payload.portalPermissions
      ? payload.portalPermissions
      : getDefaultPermissionsForAccessLevel(payload.accessLevel)

    const portalPermissions = dedupePermissions([
      ...basePermissions,
      'ADMIN_PORTAL_ACCESS',
    ])

    const managedClubIds = Array.from(new Set(payload.managedClubIds ?? []))
    if (managedClubIds.length > 0) {
      const clubs = await prisma.clubOrganization.findMany({
        where: { id: { in: managedClubIds } },
        select: { id: true, universityId: true },
      })

      if (clubs.length !== managedClubIds.length) {
        throw new ApiError(404, 'One or more selected clubs were not found')
      }

      if (clubs.some((club) => club.universityId !== payload.universityId)) {
        throw new ApiError(400, 'Managed clubs must belong to the selected university')
      }
    }

    const password = payload.password ?? buildSecurePassword()
    const supabase = createSupabaseAdminClient()
    const role = getRoleForAccessLevel(payload.accessLevel, payload.role)

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: payload.email,
      password,
      email_confirm: true,
      user_metadata: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        role,
      },
    })

    if (authError || !authData.user) {
      throw new ApiError(400, authError?.message ?? 'Unable to create auth account')
    }

    const created = await prisma
      .$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            supabaseId: authData.user.id,
            email: payload.email,
            displayName: `${payload.firstName} ${payload.lastName}`,
            firstName: payload.firstName,
            lastName: payload.lastName,
            role,
            universityId: payload.universityId,
            adminAccessLevel: payload.accessLevel,
            portalPermissions,
            canPublishCampusAnnouncements: portalPermissions.includes(
              'CAN_PUBLISH_ANNOUNCEMENTS',
            ),
          },
        })

        await tx.notificationPreferences.create({
          data: { userId: user.id },
        })

        if (managedClubIds.length > 0) {
          await tx.clubManagerAssignment.createMany({
            data: managedClubIds.map((clubId) => ({
              userId: user.id,
              clubId,
            })),
            skipDuplicates: true,
          })
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
      .catch(async (transactionError) => {
        await supabase.auth.admin.deleteUser(authData.user.id).catch(() => undefined)
        throw transactionError
      })

    return successResponse(
      {
        account: created,
        temporaryPassword: payload.password ? null : password,
      },
      201,
    )
  } catch (error) {
    return handleApiError(error)
  }
}
