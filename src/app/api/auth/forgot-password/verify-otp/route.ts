import { NextRequest } from 'next/server'
import { z } from 'zod'

import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit'
import { prisma } from '@/lib/prisma'
import { ApiError, handleApiError, successResponse } from '@/lib/api/utils'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const forgotPasswordVerifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  code: z.string().trim().min(6, 'Code must be at least 6 characters').max(12, 'Code is too long'),
})

export async function POST(request: NextRequest) {
  try {
    const rateLimit = assertRateLimit({
      key: 'auth:forgot-password-verify-otp',
      limit: 10,
      windowMs: 10 * 60_000,
      request,
      message: 'Too many recovery code attempts. Please request a new code and try again later.',
    })
    const payload = forgotPasswordVerifyOtpSchema.parse(await request.json())

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
      select: {
        id: true,
        supabaseId: true,
        emailVerified: true,
      },
    })

    if (!user) {
      throw new ApiError(404, 'No account was found for this email address.')
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
      throw new ApiError(400, 'Verification email does not match this recovery request')
    }

    if (!user.supabaseId || user.supabaseId !== data.user.id || !user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
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
