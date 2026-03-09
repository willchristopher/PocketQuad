import { prisma } from '@/lib/prisma'
import {
  getStudentFacingFacultyAvailability,
  parseLegacyFacultyAvailability,
  summarizeFacultyOfficeHours,
} from '@/lib/faculty'
import { isMissingDatabaseFieldError } from '@/lib/server/dbCompatibility'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  resolveParams,
  successResponse,
} from '@/lib/api/utils'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }>  },
) {
  try {
    const { profile } = await getAuthenticatedUser()
    const { id } = await resolveParams(context)

    let faculty:
      | {
          id: string
          userId: string
          universityId: string | null
          name: string
          title: string
          department: string
          email: string
          phone: string | null
          officeLocation: string
          officeHours: string
          imageUrl: string | null
          bio: string | null
          courses: string[]
          rating: number
          ratingCount: number
          tags: string[]
          availabilityStatus: 'AVAILABLE' | 'LIMITED' | 'AWAY'
          availabilityNote: string | null
          officeHourSlots: Array<{
            id: string
            dayOfWeek: number
            startTime: string
            endTime: string
            location: string
            mode: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID'
            isActive: boolean
            maxQueue: number
            meetingLink: string | null
            facultyId: string
            userId: string
            createdAt: Date
            updatedAt: Date
          }>
          favorites: Array<{ id: string }>
        }
      | null = null

    try {
      faculty = await prisma.faculty.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          universityId: true,
          name: true,
          title: true,
          department: true,
          email: true,
          phone: true,
          officeLocation: true,
          officeHours: true,
          imageUrl: true,
          bio: true,
          courses: true,
          rating: true,
          ratingCount: true,
          tags: true,
          availabilityStatus: true,
          availabilityNote: true,
          officeHourSlots: {
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          },
          favorites: {
            where: {
              userId: profile.id,
            },
            select: {
              id: true,
            },
          },
        },
      })
    } catch (error) {
      if (!isMissingDatabaseFieldError(error)) {
        throw error
      }

      const legacyFaculty = await prisma.faculty.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          universityId: true,
          name: true,
          title: true,
          department: true,
          email: true,
          phone: true,
          officeLocation: true,
          officeHours: true,
          imageUrl: true,
          bio: true,
          courses: true,
          rating: true,
          ratingCount: true,
          tags: true,
          officeHourSlots: {
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          },
          favorites: {
            where: {
              userId: profile.id,
            },
            select: {
              id: true,
            },
          },
        },
      })

      if (legacyFaculty) {
        const availability = parseLegacyFacultyAvailability(legacyFaculty.officeHours)
        faculty = {
          ...legacyFaculty,
          availabilityStatus: availability.status,
          availabilityNote: availability.note || null,
        }
      }
    }

    if (!faculty) {
      throw new ApiError(404, 'Faculty member not found')
    }

    if (
      profile.universityId &&
      faculty.universityId &&
      faculty.universityId !== profile.universityId
    ) {
      throw new ApiError(404, 'Faculty member not found')
    }

    const { favorites, ...facultyRecord } = faculty
    const studentAvailability = getStudentFacingFacultyAvailability(
      facultyRecord.availabilityStatus,
      facultyRecord.availabilityNote,
      facultyRecord.officeHourSlots,
    )

    return successResponse({
      ...facultyRecord,
      officeHours: summarizeFacultyOfficeHours(facultyRecord.officeHourSlots),
      studentAvailabilityLabel: studentAvailability.label,
      studentAvailabilityState: studentAvailability.state,
      isFavorited: favorites.length > 0,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
