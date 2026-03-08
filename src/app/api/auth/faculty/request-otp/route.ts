import crypto from 'node:crypto'
import { NextRequest } from 'next/server'

import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit'
import { prisma } from '@/lib/prisma'
import { ApiError, handleApiError, successResponse } from '@/lib/api/utils'
import {
  createSupabaseAdminClient,
  createSupabaseRouteHandlerClient,
} from '@/lib/supabase/server'
import { facultyRequestOtpSchema } from '@/lib/validations/auth'

export const runtime = 'nodejs'

type FacultyAccountRecord = {
  id: string
  email: string
  firstName: string
  lastName: string
  supabaseId: string | null
}

async function ensureSupabaseFacultyAuthUser(user: FacultyAccountRecord) {
  const supabaseAdmin = createSupabaseAdminClient()

  let authUserId = user.supabaseId
  if (authUserId) {
    const { data: existingAuthUser, error } = await supabaseAdmin.auth.admin.getUserById(authUserId)
    if (error || !existingAuthUser.user) {
      authUserId = null
    }
  }

  if (!authUserId) {
    const { data: createdAuthUser, error } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: `PocketQuad-${crypto.randomUUID()}-A1!`,
      email_confirm: true,
      user_metadata: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'FACULTY',
      },
    })

    if (error || !createdAuthUser.user) {
      const errorMessage = error?.message?.toLowerCase() ?? ''
      if (errorMessage.includes('already') && errorMessage.includes('registered')) {
        return null
      }
      throw new ApiError(500, error?.message ?? 'Unable to initialize faculty auth account')
    }

    authUserId = createdAuthUser.user.id
    await prisma.user.update({
      where: { id: user.id },
      data: {
        supabaseId: authUserId,
        emailVerified: true,
      },
    })
  }

  return authUserId
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = assertRateLimit({
      key: 'auth:faculty-request-otp',
      limit: 5,
      windowMs: 10 * 60_000,
      request,
      message: 'Too many faculty verification requests. Please wait before trying again.',
    })
    const payload = facultyRequestOtpSchema.parse(await request.json())

    const user = await prisma.user.findFirst({
      where: {
        email: payload.email,
        role: 'FACULTY',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        supabaseId: true,
      },
    })

    if (!user) {
      throw new ApiError(
        404,
        'No faculty account was found for this email. Contact your university administrator.',
      )
    }

    await ensureSupabaseFacultyAuthUser(user)

    const supabase = await createSupabaseRouteHandlerClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: user.email,
      options: {
        shouldCreateUser: false,
      },
    })

    if (error) {
      throw new ApiError(400, error.message || 'Unable to send one-time passcode')
    }

    return withRateLimitHeaders(successResponse({ sent: true }), rateLimit)
  } catch (error) {
    return handleApiError(error)
  }
}
