import { hasPortalPermission } from '@/lib/auth/portalPermissions'
import { canPublishCampusAnnouncements } from '@/lib/facultyPermissions'
import {
  getStudentFacingFacultyAvailability,
  normalizeFacultyTags,
  parseLegacyFacultyAvailability,
  summarizeFacultyOfficeHours,
} from '@/lib/faculty'
import { prisma } from '@/lib/prisma'
import { isMissingDatabaseFieldError } from '@/lib/server/dbCompatibility'
import { updateFacultyProfileSchema } from '@/lib/validations'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'

async function getFacultyRecord(userId: string) {
  try {
    const faculty = await prisma.faculty.findUnique({
      where: { userId },
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
        bio: true,
        tags: true,
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
        userId: true,
        universityId: true,
        name: true,
        title: true,
        department: true,
        email: true,
        phone: true,
        officeLocation: true,
        officeHours: true,
        bio: true,
        tags: true,
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
      throw new ApiError(403, 'Faculty profile is required for this action')
    }

    const availability = parseLegacyFacultyAvailability(faculty.officeHours)

    return {
      ...faculty,
      availabilityStatus: availability.status,
      availabilityNote: availability.note || null,
    }
  }
}

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser({
      includeManagedBuildings: true,
    })

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required')
    }

    const faculty = await getFacultyRecord(profile.id)
    const canManageBuildings = hasPortalPermission(profile, 'ADMIN_TAB_BUILDINGS')
    const canManageServices = hasPortalPermission(profile, 'ADMIN_TAB_SERVICES')
    const universityId = faculty.universityId ?? profile.universityId
    const managedBuildingIds = profile.managedBuildings?.map((assignment) => assignment.buildingId) ?? []

    const [availableBuildings, availableServices] = await Promise.all([
      universityId
        ? prisma.campusBuilding.findMany({
            where: canManageBuildings
              ? { universityId }
              : {
                  universityId,
                  id: {
                    in: managedBuildingIds.length > 0 ? managedBuildingIds : ['__none__'],
                  },
                },
            select: {
              id: true,
              name: true,
              type: true,
            },
            orderBy: { name: 'asc' },
          })
        : Promise.resolve([]),
      universityId && canManageServices
        ? prisma.campusService.findMany({
            where: { universityId },
            select: {
              id: true,
              name: true,
              location: true,
            },
            orderBy: { name: 'asc' },
          })
        : Promise.resolve([]),
    ])

    const studentAvailability = getStudentFacingFacultyAvailability(
      faculty.availabilityStatus,
      faculty.availabilityNote,
      faculty.officeHourSlots,
    )

    return successResponse({
      ...faculty,
      officeHours: summarizeFacultyOfficeHours(faculty.officeHourSlots),
      studentAvailabilityLabel: studentAvailability.label,
      studentAvailabilityState: studentAvailability.state,
      canPublishCampusAnnouncements: canPublishCampusAnnouncements(profile),
      canManageBuildings,
      canManageServices,
      managedBuildings: profile.managedBuildings ?? [],
      availableBuildings,
      availableServices,
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

    const payload = updateFacultyProfileSchema.parse(await request.json())
    const tags = normalizeFacultyTags(payload.tags)
    const bio = payload.bio?.trim() || null
    const phone = payload.phone?.trim() || null

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: profile.id },
        data: {
          displayName: payload.displayName,
          department: payload.department,
          location: payload.officeLocation,
          bio,
          facultyRoleTags: tags,
        },
      })

      try {
        return await tx.faculty.update({
          where: { userId: profile.id },
          data: {
            universityId: profile.universityId,
            name: payload.displayName,
            title: payload.title,
            department: payload.department,
            email: profile.email,
            phone,
            officeLocation: payload.officeLocation,
            bio,
            tags,
          },
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
            bio: true,
            tags: true,
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
      } catch (error) {
        if (!isMissingDatabaseFieldError(error)) {
          throw error
        }

        const updatedFaculty = await tx.faculty.update({
          where: { userId: profile.id },
          data: {
            universityId: profile.universityId,
            name: payload.displayName,
            title: payload.title,
            department: payload.department,
            email: profile.email,
            phone,
            officeLocation: payload.officeLocation,
            bio,
            tags,
          },
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
            bio: true,
            tags: true,
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

        const availability = parseLegacyFacultyAvailability(updatedFaculty.officeHours)

        return {
          ...updatedFaculty,
          availabilityStatus: availability.status,
          availabilityNote: availability.note || null,
        }
      }
    })

    const studentAvailability = getStudentFacingFacultyAvailability(
      updated.availabilityStatus,
      updated.availabilityNote,
      updated.officeHourSlots,
    )

    return successResponse({
      ...updated,
      officeHours: summarizeFacultyOfficeHours(updated.officeHourSlots),
      studentAvailabilityLabel: studentAvailability.label,
      studentAvailabilityState: studentAvailability.state,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
