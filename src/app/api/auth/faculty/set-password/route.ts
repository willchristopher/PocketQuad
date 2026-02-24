import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { ApiError, handleApiError, successResponse } from '@/lib/api/utils'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'
import { facultySetPasswordSchema } from '@/lib/validations/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const payload = facultySetPasswordSchema.parse(await request.json())
    const supabase = await createSupabaseRouteHandlerClient()

    const { data: currentUser, error: getUserError } = await supabase.auth.getUser()
    if (getUserError || !currentUser.user) {
      throw new ApiError(
        401,
        'Your verification session has expired. Request a new one-time passcode.',
      )
    }

    const normalizedEmail = currentUser.user.email?.toLowerCase()
    const facultyUser = await prisma.user.findFirst({
      where: normalizedEmail
        ? {
            role: 'FACULTY',
            OR: [{ supabaseId: currentUser.user.id }, { email: normalizedEmail }],
          }
        : {
            role: 'FACULTY',
            supabaseId: currentUser.user.id,
          },
      select: { id: true },
    })

    if (!facultyUser) {
      throw new ApiError(403, 'Faculty account access is required to set a faculty password')
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: payload.password,
    })

    if (updateError) {
      throw new ApiError(400, updateError.message || 'Unable to set password for this account')
    }

    await prisma.user.update({
      where: { id: facultyUser.id },
      data: {
        supabaseId: currentUser.user.id,
        emailVerified: true,
        lastLogin: new Date(),
      },
    })

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
