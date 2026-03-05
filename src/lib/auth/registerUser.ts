import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations/auth'
import { ApiError } from '@/lib/api/utils'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'
import { extractEmailDomain } from '@/lib/university'

async function ensureCampusRoomMembership(userId: string) {
  const existingChannel = await prisma.channel.findFirst({
    where: {
      type: 'PUBLIC',
      name: {
        in: ['Campus Chat', 'General'],
      },
    },
    select: { id: true, name: true, description: true },
    orderBy: { createdAt: 'asc' },
  })

  const channel = existingChannel
    ? (
        existingChannel.name === 'Campus Chat'
          ? existingChannel
          : await prisma.channel.update({
              where: { id: existingChannel.id },
              data: {
                name: 'Campus Chat',
                description:
                  existingChannel.description || 'Campus-wide respectful conversation and updates',
              },
              select: { id: true },
            })
      )
    :
    (await prisma.channel.create({
      data: {
        name: 'Campus Chat',
        description: 'Campus-wide respectful conversation and updates',
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

function assertSupportedSelfRegistrationRole(role: 'STUDENT' | 'FACULTY' | 'ADMIN') {
  if (role === 'ADMIN') {
    throw new ApiError(
      403,
      'Admin accounts cannot be self-registered. Contact your university administrator.',
    )
  }
}

export async function registerUser(rawPayload: unknown) {
  const payload = registerSchema.parse(rawPayload)
  assertSupportedSelfRegistrationRole(payload.role)

  const email = payload.email
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
      adminAccessLevel: null,
      portalPermissions: [],
      universityId: matchedUniversity?.id,
      emailVerified: Boolean(data.user.email_confirmed_at),
    },
  })

  await prisma.notificationPreferences.create({
    data: {
      userId: createdUser.id,
    },
  })

  await ensureCampusRoomMembership(createdUser.id)

  return {
    id: createdUser.id,
    email: createdUser.email,
    universityId: matchedUniversity?.id ?? null,
    universityName: matchedUniversity?.name ?? null,
    role: createdUser.role,
    emailVerified: createdUser.emailVerified,
  }
}
