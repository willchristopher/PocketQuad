import crypto from 'node:crypto'
import type { UserRole } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/api/utils'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

type PasswordRecoveryUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  supabaseId: string | null
}

export async function ensurePasswordRecoveryAuthUser(user: PasswordRecoveryUser) {
  const supabaseAdmin = createSupabaseAdminClient()

  let authUserId = user.supabaseId
  if (authUserId) {
    const { data: existingAuthUser, error } = await supabaseAdmin.auth.admin.getUserById(authUserId)
    if (error || !existingAuthUser.user) {
      authUserId = null
    }
  }

  if (!authUserId) {
    const { data: createdAuthUser, error } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: `PocketQuad-${crypto.randomUUID()}-A1!`,
      email_confirm: true,
      user_metadata: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    })

    if (error || !createdAuthUser.user) {
      const errorMessage = error?.message?.toLowerCase() ?? ''
      if (errorMessage.includes('already') && errorMessage.includes('registered')) {
        return null
      }

      throw new ApiError(500, error?.message ?? 'Unable to initialize the recovery session')
    }

    authUserId = createdAuthUser.user.id
    await prisma.user.update({
      where: { id: user.id },
      data: {
        supabaseId: authUserId,
      },
    })
  }

  return authUserId
}
