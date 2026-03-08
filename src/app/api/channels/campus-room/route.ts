import { prisma } from '@/lib/prisma'
import {
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'

async function ensureCampusRoomMembership(userId: string) {
  const existing = await prisma.channel.findFirst({
    where: {
      type: 'PUBLIC',
      name: {
        in: ['Campus Chat', 'General'],
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
      name: true,
      description: true,
    },
  })

  const channelId = existing?.id
    ? existing.id
    : (
        await prisma.channel.create({
          data: {
            name: 'Campus Chat',
            description: 'Campus-wide respectful conversation and updates',
            type: 'PUBLIC',
            createdById: userId,
          },
          select: {
            id: true,
          },
        })
      ).id

  if (existing && existing.name !== 'Campus Chat') {
    await prisma.channel.update({
      where: { id: existing.id },
      data: {
        name: 'Campus Chat',
        description: existing.description || 'Campus-wide respectful conversation and updates',
      },
    })
  }

  await prisma.channelMember.upsert({
    where: {
      channelId_userId: {
        channelId,
        userId,
      },
    },
    update: {},
    create: {
      channelId,
      userId,
      role: 'member',
    },
  })

  return prisma.channel.findUniqueOrThrow({
    where: { id: channelId },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
  })
}

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser()
    const channel = await ensureCampusRoomMembership(profile.id)

    return successResponse({
      id: channel.id,
      name: channel.name,
      description: channel.description ?? 'Campus-wide respectful conversation and updates',
      unreadCount: 0,
      memberCount: channel._count.members,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
