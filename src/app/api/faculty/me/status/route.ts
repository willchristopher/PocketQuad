import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { facultyStatusSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'

type FacultyStatus = 'AVAILABLE' | 'LIMITED' | 'OUT_OF_OFFICE'

function parseStatusFromOfficeHours(officeHours: string): { status: FacultyStatus; note: string } {
  const value = officeHours.trim()

  if (value.toLowerCase().startsWith('out of office:')) {
    return {
      status: 'OUT_OF_OFFICE',
      note: value.slice('out of office:'.length).trim(),
    }
  }

  if (value.toLowerCase().startsWith('limited availability:')) {
    return {
      status: 'LIMITED',
      note: value.slice('limited availability:'.length).trim(),
    }
  }

  if (value.toLowerCase().startsWith('available:')) {
    return {
      status: 'AVAILABLE',
      note: value.slice('available:'.length).trim(),
    }
  }

  if (value.length === 0 || value.toLowerCase() === 'tbd') {
    return {
      status: 'AVAILABLE',
      note: '',
    }
  }

  return {
    status: 'AVAILABLE',
    note: value,
  }
}

function buildOfficeHoursStatus(status: FacultyStatus, note: string | undefined) {
  const details = note?.trim()

  if (status === 'OUT_OF_OFFICE') {
    return `Out of office${details ? `: ${details}` : ''}`
  }

  if (status === 'LIMITED') {
    return `Limited availability${details ? `: ${details}` : ''}`
  }

  return `Available${details ? `: ${details}` : ''}`
}

async function getFacultyForUser(userId: string) {
  const faculty = await prisma.faculty.findUnique({
    where: { userId },
    select: {
      id: true,
      officeHours: true,
    },
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

    const faculty = await getFacultyForUser(profile.id)
    const parsed = parseStatusFromOfficeHours(faculty.officeHours)

    return successResponse({
      status: parsed.status,
      note: parsed.note,
      display: buildOfficeHoursStatus(parsed.status, parsed.note),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required')
    }

    const payload = facultyStatusSchema.parse(await request.json())
    const faculty = await getFacultyForUser(profile.id)
    const officeHours = buildOfficeHoursStatus(payload.status, payload.note)

    await prisma.faculty.update({
      where: { id: faculty.id },
      data: { officeHours },
    })

    const recipients = await prisma.facultyFavorite.findMany({
      where: {
        facultyId: faculty.id,
        user: {
          role: 'STUDENT',
          notificationPreferences: {
            is: {
              officeHourChanges: true,
            },
          },
        },
      },
      select: {
        userId: true,
      },
    })

    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: recipients.map((recipient) => ({
          userId: recipient.userId,
          type: 'OFFICE_HOUR',
          title: `${profile.displayName} updated office hours`,
          message: officeHours,
          actionUrl: `/faculty-directory/${faculty.id}`,
          actionLabel: 'View faculty profile',
        })),
      })
    }

    return successResponse(
      {
        status: payload.status,
        note: payload.note?.trim() ?? '',
        display: officeHours,
        notifiedCount: recipients.length,
      },
      200,
    )
  } catch (error) {
    return handleApiError(error)
  }
}
