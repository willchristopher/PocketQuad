import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { refreshFacultyOfficeHoursSummary } from '@/lib/server/facultyProfile'
import { createOfficeHourSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'

async function getFacultyProfile(userId: string) {
  const faculty = await prisma.faculty.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!faculty) {
    throw new ApiError(403, 'Faculty profile is required for this action')
  }

  return faculty
}

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser()

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required')
    }

    const faculty = await getFacultyProfile(profile.id)

    const officeHours = await prisma.officeHour.findMany({
      where: {
        facultyId: faculty.id,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    return successResponse(officeHours)
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

    const faculty = await getFacultyProfile(profile.id)
    const payload = createOfficeHourSchema.parse(await request.json())

    const officeHour = await prisma.officeHour.create({
      data: {
        facultyId: faculty.id,
        userId: profile.id,
        dayOfWeek: payload.dayOfWeek,
        startTime: payload.startTime,
        endTime: payload.endTime,
        location: payload.location,
        mode: payload.mode,
        maxQueue: payload.maxQueue,
        meetingLink: payload.meetingLink,
      },
    })

    await refreshFacultyOfficeHoursSummary(faculty.id)

    return successResponse(officeHour, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
