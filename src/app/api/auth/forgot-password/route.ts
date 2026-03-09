import { NextRequest } from 'next/server'

import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit'
import { prisma } from '@/lib/prisma'
import { ApiError, handleApiError, successResponse } from '@/lib/api/utils'
import { ensurePasswordRecoveryAuthUser } from '@/lib/auth/passwordRecovery'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'
import { forgotPasswordSchema } from '@/lib/validations/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const rateLimit = assertRateLimit({
      key: 'auth:forgot-password',
      limit: 5,
      windowMs: 10 * 60_000,
      request,
      message: 'Too many password reset attempts. Please try again later.',
    })
    const payload = forgotPasswordSchema.parse(await request.json())
    const email = payload.email.toLowerCase()
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        supabaseId: true,
      },
    })

    if (!user) {
      throw new ApiError(404, 'No account was found for this email address.')
    }

    await ensurePasswordRecoveryAuthUser(user)

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

    return withRateLimitHeaders(successResponse({ sent: true }), rateLimit)
  } catch (error) {
    return handleApiError(error)
  }
}
