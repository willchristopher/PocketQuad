import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createEventSchema, eventQuerySchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'

function formatTimeLabel(time24: string) {
  const [hoursRaw, minutesRaw] = time24.split(':').map(Number)
  const period = hoursRaw >= 12 ? 'PM' : 'AM'
  const hours = hoursRaw % 12 || 12
  return `${hours}:${String(minutesRaw).padStart(2, '0')} ${period}`
}

export async function GET(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const requestedUniversityId = request.nextUrl.searchParams.get('universityId') ?? undefined
    const universityId =
      profile.role === 'ADMIN' && requestedUniversityId
        ? requestedUniversityId
        : profile.universityId ?? undefined

    const payload = eventQuerySchema.parse({
      category: request.nextUrl.searchParams.get('category') ?? undefined,
      search: request.nextUrl.searchParams.get('search') ?? undefined,
      upcoming:
        request.nextUrl.searchParams.get('upcoming') === null
          ? undefined
          : request.nextUrl.searchParams.get('upcoming') === 'true',
      page: request.nextUrl.searchParams.get('page') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
    })

    const where = {
      ...(universityId ? { universityId } : {}),
      ...(payload.category ? { category: payload.category } : {}),
      ...(payload.search
        ? {
            OR: [
              { title: { contains: payload.search, mode: 'insensitive' as const } },
              { description: { contains: payload.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(payload.upcoming ? { date: { gte: new Date() } } : {}),
      isPublished: true,
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          _count: { select: { interests: true } },
          interests: {
            where: { userId: profile.id },
            select: { id: true },
          },
        },
        orderBy: { date: 'asc' },
        skip: (payload.page - 1) * payload.limit,
        take: payload.limit,
      }),
      prisma.event.count({ where }),
    ])

    const items = events.map((event) => ({
      ...event,
      interestedCount: event._count.interests,
      isInterested: event.interests.length > 0,
    }))

    return successResponse({
      items,
      page: payload.page,
      limit: payload.limit,
      total,
      hasMore: payload.page * payload.limit < total,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required')
    }

    const payload = createEventSchema.parse(await request.json())

    const event = await prisma.event.create({
      data: {
        universityId: profile.universityId,
        title: payload.title,
        description: payload.description,
        date: new Date(`${payload.date}T00:00:00`),
        time: formatTimeLabel(payload.time),
        location: payload.location,
        category: payload.category,
        organizer: profile.displayName,
        organizerId: profile.id,
        maxAttendees: payload.maxAttendees,
      },
    })

    let notifiedCount = 0

    const faculty = await prisma.faculty.findUnique({
      where: { userId: profile.id },
      select: { id: true },
    })

    if (faculty) {
      const subscribers = await prisma.facultyFavorite.findMany({
        where: {
          facultyId: faculty.id,
          user: {
            role: 'STUDENT',
            notificationPreferences: {
              is: {
                newEvents: true,
              },
            },
          },
        },
        select: {
          userId: true,
        },
      })

      if (subscribers.length > 0) {
        await prisma.notification.createMany({
          data: subscribers.map((subscriber) => ({
            userId: subscriber.userId,
            type: 'NEW_EVENT',
            title: `${profile.displayName} created a new event`,
            message: `${event.title} | ${event.time} | ${event.location}`,
            actionUrl: `/events/${event.id}`,
            actionLabel: 'View event',
          })),
        })
      }

      notifiedCount = subscribers.length
    }

    return successResponse({ ...event, notifiedCount }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
