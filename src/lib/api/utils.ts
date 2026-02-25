import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import type { UserRole } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import {
  canAccessAdminPortal,
  hasAnyPortalPermission,
  hasPortalPermission,
  resolvePortalPermissions,
  type AdminAccessLevel,
  type PortalPermission,
} from '@/lib/auth/portalPermissions'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'

export class ApiError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

type GetAuthenticatedUserOptions = {
  includePreferences?: boolean
  includeUniversity?: boolean
  includeManagedClubs?: boolean
}

type AuthenticatedProfile = {
  id: string
  supabaseId: string | null
  universityId: string | null
  email: string
  displayName: string
  firstName: string
  lastName: string
  avatar: string | null
  role: UserRole
  canPublishCampusAnnouncements: boolean
  adminAccessLevel: AdminAccessLevel | null
  portalPermissions: PortalPermission[]
  managedClubs?: Array<{
    clubId: string
    club: {
      id: string
      universityId: string
      name: string
    }
  }>
  notificationPreferences?: {
    officeHourChanges: boolean
    newEvents: boolean
    eventReminders: boolean
    deadlineReminders: boolean
    emailDigest: boolean
    pushEnabled: boolean
    theme: string
  } | null
  university?: {
    id: string
    name: string
    domain: string | null
  } | null
}

async function ensureFacultyProfile(profile: AuthenticatedProfile) {
  if (profile.role !== 'FACULTY') {
    return
  }

  const normalizedDisplayName = profile.displayName.trim()
  const fallbackName = `${profile.firstName} ${profile.lastName}`.trim()
  const name = normalizedDisplayName || fallbackName || profile.email

  await prisma.faculty.upsert({
    where: {
      userId: profile.id,
    },
    update: {
      email: profile.email,
      universityId: profile.universityId,
    },
    create: {
      userId: profile.id,
      universityId: profile.universityId,
      name,
      title: 'Faculty Member',
      department: 'General',
      email: profile.email,
      officeLocation: 'TBD',
      officeHours: 'TBD',
      courses: [],
      tags: [],
    },
  })
}

const BASE_PROFILE_SELECT = {
  id: true,
  supabaseId: true,
  universityId: true,
  email: true,
  displayName: true,
  firstName: true,
  lastName: true,
  avatar: true,
  role: true,
  canPublishCampusAnnouncements: true,
  adminAccessLevel: true,
  portalPermissions: true,
} as const

export async function getAuthenticatedUser(options: GetAuthenticatedUserOptions = {}) {
  const supabase = await createSupabaseRouteHandlerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new ApiError(401, 'Unauthorized')
  }

  const normalizedEmail = data.user.email?.toLowerCase()
  const where = normalizedEmail
    ? {
        OR: [
          { supabaseId: data.user.id },
          { email: normalizedEmail },
        ],
      }
    : { supabaseId: data.user.id }

  const profile = await prisma.user.findFirst({
    where,
    select: {
      ...BASE_PROFILE_SELECT,
      ...(options.includePreferences
        ? {
            notificationPreferences: {
              select: {
                officeHourChanges: true,
                newEvents: true,
                eventReminders: true,
                deadlineReminders: true,
                emailDigest: true,
                pushEnabled: true,
                theme: true,
              },
            },
          }
        : {}),
      ...(options.includeUniversity
        ? {
            university: {
              select: {
                id: true,
                name: true,
                domain: true,
              },
            },
          }
        : {}),
      ...(options.includeManagedClubs
        ? {
            managedClubs: {
              select: {
                clubId: true,
                club: {
                  select: {
                    id: true,
                    universityId: true,
                    name: true,
                  },
                },
              },
            },
          }
        : {}),
    },
  }) as AuthenticatedProfile | null

  if (!profile) {
    throw new ApiError(404, 'User profile not found')
  }

  if (!profile.supabaseId) {
    await prisma.user.update({
      where: { id: profile.id },
      data: { supabaseId: data.user.id },
    })
  }

  await ensureFacultyProfile(profile)

  return { supabaseUser: data.user, profile }
}

export async function getAuthenticatedAdmin(
  requiredPermission?: PortalPermission | PortalPermission[],
) {
  return getAuthenticatedPortalUser(requiredPermission)
}

export async function getAuthenticatedPortalUser(
  requiredPermission?: PortalPermission | PortalPermission[],
) {
  const authenticated = await getAuthenticatedUser({
    includeManagedClubs: true,
  })

  if (!canAccessAdminPortal(authenticated.profile)) {
    throw new ApiError(403, 'Portal access required')
  }

  if (requiredPermission) {
    const required = Array.isArray(requiredPermission)
      ? requiredPermission
      : [requiredPermission]

    const hasAll = required.every((permission) =>
      hasPortalPermission(authenticated.profile, permission),
    )

    if (!hasAll) {
      throw new ApiError(403, 'You do not have permission for this action')
    }
  }

  return {
    ...authenticated,
    resolvedPermissions: resolvePortalPermissions(authenticated.profile),
  }
}

export function requireAnyPortalPermission(
  profile: {
    role: 'STUDENT' | 'FACULTY' | 'ADMIN'
    adminAccessLevel?: AdminAccessLevel | null
    portalPermissions?: PortalPermission[] | null
    canPublishCampusAnnouncements?: boolean
  },
  permissions: PortalPermission[],
) {
  if (!hasAnyPortalPermission(profile, permissions)) {
    throw new ApiError(403, 'You do not have permission for this action')
  }
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    const flat = error.flatten()
    const fieldMessages = Object.entries(flat.fieldErrors)
      .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
    const formMessages = flat.formErrors
    const firstMessage = fieldMessages[0] ?? formMessages[0] ?? 'Validation failed'

    return NextResponse.json(
      {
        error: firstMessage,
        issues: flat,
      },
      { status: 400 },
    )
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: error.statusCode },
    )
  }

  console.error(error)

  return NextResponse.json(
    {
      error: 'Internal server error',
    },
    { status: 500 },
  )
}

export async function parseJsonBody<T>(request: Request) {
  return (await request.json()) as T
}

export async function resolveParams<T>(
  context: { params: Promise<T> },
): Promise<T> {
  return context.params
}

export function parseBoolean(value: string | null) {
  if (value === null) return undefined
  return value === 'true'
}

export function parseNumber(value: string | null, defaultValue: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : defaultValue
}
