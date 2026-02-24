import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations/auth'
import { ApiError, handleApiError, successResponse } from '@/lib/api/utils'
import { getDefaultPermissionsForAccessLevel } from '@/lib/auth/portalPermissions'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'
import { extractEmailDomain } from '@/lib/university'

async function ensureGeneralChannelMembership(userId: string) {
  const existingChannel = await prisma.channel.findFirst({
    where: {
      type: 'PUBLIC',
      name: 'General',
    },
    select: { id: true },
  })

  const channel =
    existingChannel ??
    (await prisma.channel.create({
      data: {
        name: 'General',
        description: 'Campus-wide updates and conversation',
        type: 'PUBLIC',
        createdById: userId,
      },
      select: { id: true },
    }))

  await prisma.channelMember.upsert({
    where: {
      channelId_userId: {
        channelId: channel.id,
        userId,
      },
    },
    update: {},
    create: {
      channelId: channel.id,
      userId,
      role: 'member',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const payload = registerSchema.parse(await request.json())
    const email = payload.email.toLowerCase()
    const emailDomain = extractEmailDomain(email)

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new ApiError(409, 'Email is already registered')
    }

    const supabase = await createSupabaseRouteHandlerClient()
    let data: Awaited<ReturnType<typeof supabase.auth.signUp>>['data']
    let error: Awaited<ReturnType<typeof supabase.auth.signUp>>['error']
    try {
      const authResponse = await supabase.auth.signUp({
        email,
        password: payload.password,
        options: {
          data: {
            firstName: payload.firstName,
            lastName: payload.lastName,
            role: payload.role,
          },
        },
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
      throw new ApiError(400, error?.message ?? 'Unable to register user')
    }

    const matchedUniversity = emailDomain
      ? await prisma.university.findFirst({
          where: { domain: emailDomain },
          select: { id: true, name: true },
        })
      : null

    const createdUser = await prisma.user.create({
      data: {
        supabaseId: data.user.id,
        email,
        displayName: `${payload.firstName} ${payload.lastName}`,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: payload.role,
        adminAccessLevel: payload.role === 'ADMIN' ? 'OWNER' : null,
        portalPermissions:
          payload.role === 'ADMIN'
            ? getDefaultPermissionsForAccessLevel('OWNER')
            : [],
        universityId: matchedUniversity?.id,
      },
    })

    await prisma.notificationPreferences.create({
      data: {
        userId: createdUser.id,
      },
    })

    if (payload.role === 'FACULTY') {
      await prisma.faculty.upsert({
        where: { userId: createdUser.id },
        update: {},
        create: {
          userId: createdUser.id,
          name: `${createdUser.firstName} ${createdUser.lastName}`,
          title: 'Faculty Member',
          department: 'General Studies',
          email: createdUser.email,
          officeLocation: 'TBD',
          officeHours: 'TBD',
          courses: [],
          tags: [],
          universityId: matchedUniversity?.id,
        },
      })
    }

    await ensureGeneralChannelMembership(createdUser.id)

    return successResponse(
      {
        id: createdUser.id,
        email: createdUser.email,
        universityId: matchedUniversity?.id ?? null,
        universityName: matchedUniversity?.name ?? null,
      },
      201,
    )
  } catch (error) {
    return handleApiError(error)
  }
}
