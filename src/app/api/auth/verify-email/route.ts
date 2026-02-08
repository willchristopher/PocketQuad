import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { ApiError, handleApiError, successResponse } from '@/lib/api/utils'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'

const verifyEmailSchema = z
  .object({
    token: z.string().optional(),
    tokenHash: z.string().optional(),
    type: z.enum(['signup', 'email']).optional(),
  })
  .refine((value) => Boolean(value.token || value.tokenHash), {
    message: 'token or tokenHash is required',
  })

function getJwtSecret() {
  const secret = process.env.APP_JWT_SECRET
  if (!secret) {
    throw new ApiError(500, 'APP_JWT_SECRET is not configured')
  }

  return secret
}

export async function POST(request: NextRequest) {
  try {
    const payload = verifyEmailSchema.parse(await request.json())

    if (payload.tokenHash) {
      const supabase = await createSupabaseRouteHandlerClient()
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: payload.tokenHash,
        type: payload.type ?? 'signup',
      })

      if (error || !data.user) {
        throw new ApiError(400, error?.message ?? 'Invalid verification token')
      }

      await prisma.user.updateMany({
        where: {
          OR: [
            { supabaseId: data.user.id },
            ...(data.user.email ? [{ email: data.user.email.toLowerCase() }] : []),
          ],
        },
        data: { emailVerified: true },
      })

      return successResponse({ success: true })
    }

    const decoded = jwt.verify(payload.token!, getJwtSecret()) as {
      email?: string
      type?: string
    }

    if (decoded.type !== 'email_verification' || !decoded.email) {
      throw new ApiError(400, 'Invalid verification token')
    }

    await prisma.user.update({
      where: { email: decoded.email.toLowerCase() },
      data: { emailVerified: true },
    })

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
