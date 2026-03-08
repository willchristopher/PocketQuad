import { NextRequest } from 'next/server'

import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit'
import { forgotPasswordSchema } from '@/lib/validations/auth'
import { ApiError, handleApiError, successResponse } from '@/lib/api/utils'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'

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
    const supabase = await createSupabaseRouteHandlerClient()

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(payload.email.toLowerCase(), {
      redirectTo,
    })

    if (error) {
      throw new ApiError(400, error.message)
    }

    return withRateLimitHeaders(successResponse({ success: true }), rateLimit)
  } catch (error) {
    return handleApiError(error)
  }
}
