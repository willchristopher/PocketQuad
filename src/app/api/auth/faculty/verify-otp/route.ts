import { NextRequest } from 'next/server'

import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit'
import { prisma } from '@/lib/prisma'
import { ApiError, handleApiError, successResponse } from '@/lib/api/utils'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'
import { facultyVerifyOtpSchema } from '@/lib/validations/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const rateLimit = assertRateLimit({
      key: 'auth:faculty-verify-otp',
      limit: 10,
      windowMs: 10 * 60_000,
      request,
      message: 'Too many faculty verification attempts. Please request a new code and try again later.',
    })
    const payload = facultyVerifyOtpSchema.parse(await request.json())

    const facultyUser = await prisma.user.findFirst({
      where: {
        email: payload.email,
        role: 'FACULTY',
      },
      select: {
        id: true,
        supabaseId: true,
      },
    })

    if (!facultyUser) {
      throw new ApiError(
        404,
        'No faculty account was found for this email. Contact your university administrator.',
      )
    }

    const supabase = await createSupabaseRouteHandlerClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email: payload.email,
      token: payload.code,
      type: 'email',
    })

    if (error || !data.user) {
      throw new ApiError(400, error?.message ?? 'Invalid or expired one-time passcode')
    }

    const normalizedAuthEmail = data.user.email?.toLowerCase()
    if (normalizedAuthEmail && normalizedAuthEmail !== payload.email) {
      throw new ApiError(400, 'Verification email does not match this faculty account')
    }

    if (!facultyUser.supabaseId || facultyUser.supabaseId !== data.user.id) {
      await prisma.user.update({
        where: { id: facultyUser.id },
        data: {
          supabaseId: data.user.id,
          emailVerified: true,
        },
      })
    }

    return withRateLimitHeaders(successResponse({ verified: true }), rateLimit)
  } catch (error) {
    return handleApiError(error)
  }
}
