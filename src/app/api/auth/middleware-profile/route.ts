import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createSupabaseRouteHandlerClient()
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      return NextResponse.json({ data: null }, { status: 200 })
    }

    const normalizedEmail = data.user.email?.toLowerCase()
    const profile = await prisma.user.findFirst({
      where: normalizedEmail
        ? {
            OR: [{ supabaseId: data.user.id }, { email: normalizedEmail }],
          }
        : { supabaseId: data.user.id },
      select: {
        role: true,
        adminAccessLevel: true,
        portalPermissions: true,
        canPublishCampusAnnouncements: true,
        emailVerified: true,
      },
    })

    return NextResponse.json({ data: profile }, { status: 200 })
  } catch {
    return NextResponse.json({ data: null }, { status: 200 })
  }
}
