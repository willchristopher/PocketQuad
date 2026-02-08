import { prisma } from '@/lib/prisma'
import { handleApiError, successResponse } from '@/lib/api/utils'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createSupabaseRouteHandlerClient()
    const [{ data: sessionData }, { data: userData }] = await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.getUser(),
    ])

    if (!userData.user) {
      return successResponse({ session: null, user: null, profile: null })
    }

    const profile = await prisma.user.findFirst({
      where: {
        OR: [
          { supabaseId: userData.user.id },
          ...(userData.user.email ? [{ email: userData.user.email.toLowerCase() }] : []),
        ],
      },
      include: {
        notificationPreferences: true,
      },
    })

    return successResponse({
      session: sessionData.session,
      user: userData.user,
      profile,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
