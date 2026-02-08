import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { prisma } from '@/lib/prisma'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'

export class ApiError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseRouteHandlerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new ApiError(401, 'Unauthorized')
  }

  const where = data.user.email
    ? {
        OR: [
          { supabaseId: data.user.id },
          { email: data.user.email },
        ],
      }
    : { supabaseId: data.user.id }

  const profile = await prisma.user.findFirst({
    where,
    include: { notificationPreferences: true },
  })

  if (!profile) {
    throw new ApiError(404, 'User profile not found')
  }

  if (!profile.supabaseId) {
    await prisma.user.update({
      where: { id: profile.id },
      data: { supabaseId: data.user.id },
    })
  }

  return { supabaseUser: data.user, profile }
}

export async function getAuthenticatedAdmin() {
  const authenticated = await getAuthenticatedUser()

  if (authenticated.profile.role !== 'ADMIN') {
    throw new ApiError(403, 'Admin access required')
  }

  return authenticated
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        issues: error.flatten(),
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
