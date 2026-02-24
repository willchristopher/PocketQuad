import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'
import {
  getClubsCached,
  getCampusServicesCached,
  getResourceLinksCached,
} from '@/lib/server/universityData'

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser()

    const universityId = profile.universityId ?? undefined

    const [upcomingEvents, upcomingDeadlines, serviceSnapshot, quickLinks, clubSnapshot, favoriteFaculty] =
      await Promise.all([
        prisma.event.findMany({
          where: {
            ...(universityId ? { universityId } : {}),
            date: { gte: new Date() },
            isPublished: true,
          },
          select: {
            id: true,
            title: true,
            date: true,
            time: true,
            location: true,
          },
          orderBy: { date: 'asc' },
          take: 4,
        }),
        prisma.deadline.findMany({
          where: {
            userId: profile.id,
            dueDate: { gte: new Date() },
          },
          select: {
            id: true,
            title: true,
            course: true,
            priority: true,
            dueDate: true,
          },
          orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }],
          take: 3,
        }),
        getCampusServicesCached(universityId, undefined).then((records) => records.slice(0, 3)),
        getResourceLinksCached(universityId, undefined, undefined).then((records) => records.slice(0, 4)),
        getClubsCached(universityId, undefined, undefined).then((records) => records.slice(0, 3)),
        prisma.facultyFavorite.findMany({
          where: { userId: profile.id },
          select: {
            faculty: {
              select: {
                id: true,
                name: true,
                department: true,
                officeHours: true,
                officeLocation: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }).then((rows) => rows.map((r) => r.faculty)),
      ])

    return successResponse({
      upcomingEvents,
      upcomingDeadlines,
      serviceSnapshot,
      quickLinks,
      clubSnapshot,
      favoriteFaculty,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
