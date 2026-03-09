import { NextRequest } from 'next/server'

import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit'
import { prisma } from '@/lib/prisma'
import { ApiError, handleApiError, successResponse } from '@/lib/api/utils'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'
import { facultySetPasswordSchema } from '@/lib/validations/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const rateLimit = assertRateLimit({
      key: 'auth:forgot-password-reset',
      limit: 5,
      windowMs: 10 * 60_000,
      request,
      message: 'Too many password reset attempts. Please wait before trying again.',
    })
    const payload = facultySetPasswordSchema.parse(await request.json())
    const supabase = await createSupabaseRouteHandlerClient()

    const { data: currentUser, error: getUserError } = await supabase.auth.getUser()
    if (getUserError || !currentUser.user) {
      throw new ApiError(
        401,
        'Your recovery session has expired. Request a new one-time passcode.',
      )
    }

    const normalizedEmail = currentUser.user.email?.toLowerCase()
    const user = await prisma.user.findFirst({
      where: normalizedEmail
        ? {
            OR: [{ supabaseId: currentUser.user.id }, { email: normalizedEmail }],
          }
        : {
            supabaseId: currentUser.user.id,
          },
      select: { id: true },
    })

    if (!user) {
      throw new ApiError(403, 'A valid PocketQuad account is required to reset the password')
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: payload.password,
    })

    if (updateError) {
      throw new ApiError(400, updateError.message || 'Unable to update this password')
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        supabaseId: currentUser.user.id,
        emailVerified: true,
      },
    })

    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      console.error('Unable to clear recovery session after password reset', signOutError)
    }

    return withRateLimitHeaders(successResponse({ success: true }), rateLimit)
  } catch (error) {
    return handleApiError(error)
  }
}
