import {
  composeFacultyOfficeHoursSummary,
  parseLegacyFacultyAvailability,
} from '@/lib/faculty'
import { prisma } from '@/lib/prisma'
import { isMissingDatabaseFieldError } from '@/lib/server/dbCompatibility'

type FacultyClient = Pick<typeof prisma, 'faculty'>

export async function refreshFacultyOfficeHoursSummary(
  facultyId: string,
  tx: FacultyClient = prisma,
) {
  try {
    const faculty = await tx.faculty.findUnique({
      where: { id: facultyId },
      select: {
        availabilityStatus: true,
        availabilityNote: true,
        officeHourSlots: {
          select: {
            dayOfWeek: true,
            startTime: true,
            endTime: true,
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    })

    if (!faculty) {
      return null
    }

    const officeHours = composeFacultyOfficeHoursSummary(
      faculty.availabilityStatus,
      faculty.availabilityNote,
      faculty.officeHourSlots,
    )

    await tx.faculty.update({
      where: { id: facultyId },
      data: { officeHours },
    })

    return officeHours
  } catch (error) {
    if (!isMissingDatabaseFieldError(error)) {
      throw error
    }

    const faculty = await tx.faculty.findUnique({
      where: { id: facultyId },
      select: {
        officeHours: true,
        officeHourSlots: {
          select: {
            dayOfWeek: true,
            startTime: true,
            endTime: true,
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    })

    if (!faculty) {
      return null
    }

    const availability = parseLegacyFacultyAvailability(faculty.officeHours)
    const officeHours = composeFacultyOfficeHoursSummary(
      availability.status,
      availability.note,
      faculty.officeHourSlots,
    )

    await tx.faculty.update({
      where: { id: facultyId },
      data: { officeHours },
    })

    return officeHours
  }
}
