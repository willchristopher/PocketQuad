import { NextRequest } from 'next/server'

import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit'
import { handleApiError, successResponse } from '@/lib/api/utils'
import { registerUser } from '@/lib/auth/registerUser'

export async function POST(request: NextRequest) {
  try {
    const rateLimit = assertRateLimit({
      key: 'auth:register',
      limit: 5,
      windowMs: 10 * 60_000,
      request,
      message: 'Too many registration attempts. Please try again in a few minutes.',
    })
    const data = await registerUser(await request.json())
    return withRateLimitHeaders(successResponse(data, 201), rateLimit)
  } catch (error) {
    return handleApiError(error)
  }
}
