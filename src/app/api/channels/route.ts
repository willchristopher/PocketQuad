import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createChannelSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  parseNumber,
  successResponse,
} from '@/lib/api/utils'

export async function GET(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const limit = Math.min(100, Math.max(1, parseNumber(request.nextUrl.searchParams.get('limit'), 50)))

    const memberships = await prisma.channelMember.findMany({
      where: { userId: profile.id },
      take: limit,
      include: {
        channel: {
          include: {
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    })

    const channels = memberships.map(({ channel }: { channel: any }) => ({
      ...channel,
      memberCount: channel._count.members,
      unreadCount: 0,
    }))

    return successResponse(channels)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const payload = createChannelSchema.parse(await request.json())

    if (payload.type === 'DIRECT') {
      throw new ApiError(400, 'Direct channels must be created through DM flow')
    }

    const channel = await prisma.channel.create({
      data: {
        name: payload.name,
        description: payload.description,
        type: payload.type,
        createdById: profile.id,
        members: {
          create: {
            userId: profile.id,
            role: 'admin',
          },
        },
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    })

    return successResponse(
      {
        ...channel,
        memberCount: channel._count.members,
        unreadCount: 0,
      },
      201,
    )
  } catch (error) {
    return handleApiError(error)
  }
}
