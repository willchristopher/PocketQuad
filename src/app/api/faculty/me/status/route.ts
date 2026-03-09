import { prisma } from '@/lib/prisma'
import {
  composeFacultyOfficeHoursSummary,
  formatFacultyAvailability,
  parseLegacyFacultyAvailability,
} from '@/lib/faculty'
import { refreshFacultyOfficeHoursSummary } from '@/lib/server/facultyProfile'
import { isMissingDatabaseFieldError } from '@/lib/server/dbCompatibility'
import { facultyStatusSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'

async function getFacultyForUser(userId: string) {
  try {
    const faculty = await prisma.faculty.findUnique({
      where: { userId },
      select: {
        id: true,
        availabilityStatus: true,
        availabilityNote: true,
      },
    })

    if (!faculty) {
      throw new ApiError(403, 'Faculty profile is required for this action')
    }

    return faculty
  } catch (error) {
    if (!isMissingDatabaseFieldError(error)) {
      throw error
    }

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

    const parsed = parseLegacyFacultyAvailability(faculty.officeHours)

    return {
      id: faculty.id,
      availabilityStatus: parsed.status,
      availabilityNote: parsed.note || null,
    }
  }
}

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser()

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required')
    }

    const faculty = await getFacultyForUser(profile.id)

    return successResponse({
      status: faculty.availabilityStatus,
      note: faculty.availabilityNote ?? '',
      display: formatFacultyAvailability(
        faculty.availabilityStatus,
        faculty.availabilityNote,
      ),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const { profile } = await getAuthenticatedUser()

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required')
    }

    const payload = facultyStatusSchema.parse(await request.json())
    const faculty = await getFacultyForUser(profile.id)

    let display: string | null = null

    try {
      await prisma.faculty.update({
        where: { id: faculty.id },
        data: {
          availabilityStatus: payload.status,
          availabilityNote: payload.note?.trim() || null,
        },
      })

      display = await refreshFacultyOfficeHoursSummary(faculty.id)
    } catch (error) {
      if (!isMissingDatabaseFieldError(error)) {
        throw error
      }

      const slots = await prisma.officeHour.findMany({
        where: { facultyId: faculty.id },
        select: {
          dayOfWeek: true,
          startTime: true,
          endTime: true,
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      })

      display = composeFacultyOfficeHoursSummary(
        payload.status,
        payload.note,
        slots,
      )

      await prisma.faculty.update({
        where: { id: faculty.id },
        data: {
          officeHours: display,
        },
      })
    }

    const message =
      display ??
      formatFacultyAvailability(payload.status, payload.note)

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
          title: `${profile.displayName} updated availability`,
          message,
          actionUrl: `/faculty-directory/${faculty.id}`,
          actionLabel: 'View faculty profile',
        })),
      })
    }

    return successResponse(
      {
        status: payload.status,
        note: payload.note?.trim() ?? '',
        display: formatFacultyAvailability(payload.status, payload.note),
        notifiedCount: recipients.length,
      },
      200,
    )
  } catch (error) {
    return handleApiError(error)
  }
}
