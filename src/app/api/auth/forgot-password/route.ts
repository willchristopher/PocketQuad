import { NextRequest } from 'next/server'

import { forgotPasswordSchema } from '@/lib/validations/auth'
import { ApiError, handleApiError, successResponse } from '@/lib/api/utils'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const payload = forgotPasswordSchema.parse(await request.json())
    const supabase = await createSupabaseRouteHandlerClient()

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(payload.email.toLowerCase(), {
      redirectTo,
    })

    if (error) {
      throw new ApiError(400, error.message)
    }

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
