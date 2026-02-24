import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validations/auth'
import { ApiError, handleApiError, successResponse } from '@/lib/api/utils'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const payload = loginSchema.parse(await request.json())
    const supabase = await createSupabaseRouteHandlerClient()

    let data: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['data']
    let error: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['error']
    try {
      const authResponse = await supabase.auth.signInWithPassword({
        email: payload.email.toLowerCase(),
        password: payload.password,
      })
      data = authResponse.data
      error = authResponse.error
    } catch {
      throw new ApiError(
        500,
        'Supabase auth request failed. Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel and redeploy.',
      )
    }

    if (error || !data.user) {
      throw new ApiError(401, error?.message ?? 'Invalid credentials')
    }

    if (data.user.email) {
      await prisma.user.updateMany({
        where: {
          OR: [{ supabaseId: data.user.id }, { email: data.user.email.toLowerCase() }],
        },
        data: {
          lastLogin: new Date(),
          supabaseId: data.user.id,
        },
      })
    }

    return successResponse({
      user: data.user,
      session: data.session,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
