import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import {
  getAuthenticatedUser,
  handleApiError,
  parseBoolean,
  parseNumber,
  successResponse,
} from '@/lib/api/utils'

export async function GET(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const unread = parseBoolean(request.nextUrl.searchParams.get('unread'))
    const countOnly = parseBoolean(request.nextUrl.searchParams.get('countOnly'))
    const page = Math.max(1, parseNumber(request.nextUrl.searchParams.get('page'), 1))
    const limit = Math.min(100, Math.max(1, parseNumber(request.nextUrl.searchParams.get('limit'), 20)))

    const where = {
      userId: profile.id,
      ...(unread ? { read: false } : {}),
    }

    if (countOnly) {
      const count = await prisma.notification.count({
        where: {
          userId: profile.id,
          ...(unread ? { read: false } : {}),
        },
      })

      return successResponse({ count })
    }

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ])

    return successResponse({
      items,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
