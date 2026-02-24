import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations/auth'
import { ApiError } from '@/lib/api/utils'
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

function assertSupportedSelfRegistrationRole(role: 'STUDENT' | 'FACULTY' | 'ADMIN') {
  if (role === 'STUDENT') {
    throw new ApiError(
      400,
      'Student onboarding requires one-time email verification. Use the student signup OTP flow.',
    )
  }

  if (role === 'FACULTY') {
    throw new ApiError(
      400,
      'Faculty onboarding requires account validation. Use the faculty activation flow instead.',
    )
  }

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
      adminAccessLevel: null,
      portalPermissions: [],
      universityId: matchedUniversity?.id,
    },
  })

  await prisma.notificationPreferences.create({
    data: {
      userId: createdUser.id,
    },
  })

  await ensureGeneralChannelMembership(createdUser.id)

  return {
    id: createdUser.id,
    email: createdUser.email,
    universityId: matchedUniversity?.id ?? null,
    universityName: matchedUniversity?.name ?? null,
    role: createdUser.role,
  }
}
