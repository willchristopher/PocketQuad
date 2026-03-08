import crypto from 'node:crypto'
import { NextRequest } from 'next/server'

import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit'
import { prisma } from '@/lib/prisma'
import { ApiError, handleApiError, successResponse } from '@/lib/api/utils'
import {
  createSupabaseAdminClient,
  createSupabaseRouteHandlerClient,
} from '@/lib/supabase/server'
import { extractEmailDomain } from '@/lib/university'
import { studentRequestOtpSchema } from '@/lib/validations/auth'

export const runtime = 'nodejs'

type StudentAuthSeed = {
  email: string
  firstName: string
  lastName: string
}

async function ensureSupabaseStudentAuthUser(seed: StudentAuthSeed) {
  const supabaseAdmin = createSupabaseAdminClient()
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email: seed.email,
    password: `PocketQuad-${crypto.randomUUID()}-A1!`,
    email_confirm: true,
    user_metadata: {
      firstName: seed.firstName,
      lastName: seed.lastName,
      role: 'STUDENT',
    },
  })

  if (!error) {
    return
  }

  const errorMessage = error.message?.toLowerCase() ?? ''
  if (errorMessage.includes('already') && errorMessage.includes('registered')) {
    return
  }

  throw new ApiError(500, error.message ?? 'Unable to initialize student auth account')
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = assertRateLimit({
      key: 'auth:student-request-otp',
      limit: 5,
      windowMs: 10 * 60_000,
      request,
      message: 'Too many student verification requests. Please wait before trying again.',
    })
    const payload = studentRequestOtpSchema.parse(await request.json())
    const email = payload.email.toLowerCase()
    const emailDomain = extractEmailDomain(email)

    if (!emailDomain) {
      throw new ApiError(400, 'A university email address is required')
    }

    const matchedUniversity = await prisma.university.findFirst({
      where: { domain: emailDomain },
      select: { id: true, name: true },
    })

    if (!matchedUniversity) {
      throw new ApiError(
        400,
        'This email domain is not linked to a registered university in PocketQuad.',
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      throw new ApiError(409, 'Email is already registered')
    }

    await ensureSupabaseStudentAuthUser({
      email,
      firstName: payload.firstName,
      lastName: payload.lastName,
    })

    const supabase = await createSupabaseRouteHandlerClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    })

    if (error) {
      throw new ApiError(400, error.message || 'Unable to send one-time passcode')
    }

    return withRateLimitHeaders(
      successResponse({
        sent: true,
        universityId: matchedUniversity.id,
        universityName: matchedUniversity.name,
      }),
      rateLimit,
    )
  } catch (error) {
    return handleApiError(error)
  }
}
