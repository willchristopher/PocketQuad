import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils'
import { invalidateUniversityData, UNIVERSITY_DATA_TAGS } from '@/lib/server/universityData'
import { adminFacultyCreateSchema } from '@/lib/validations/admin'

function splitName(name: string) {
  const parts = name.trim().split(/\s+/)
  const firstName = parts[0] ?? 'Faculty'
  const lastName = parts.slice(1).join(' ') || 'Member'
  return { firstName, lastName }
}

export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedAdmin('ADMIN_TAB_FACULTY')

    const universityId = request.nextUrl.searchParams.get('universityId') ?? undefined
    const query = request.nextUrl.searchParams.get('search')?.trim()

    const faculty = await prisma.faculty.findMany({
      where: {
        ...(universityId ? { universityId } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { title: { contains: query, mode: 'insensitive' } },
                { department: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            canPublishCampusAnnouncements: true,
          },
        },
        university: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: [{ university: { name: 'asc' } }, { name: 'asc' }],
    })

    return successResponse(faculty)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedAdmin('ADMIN_TAB_FACULTY')
    const payload = adminFacultyCreateSchema.parse(await request.json())

    const existingUniversity = await prisma.university.findUnique({
      where: { id: payload.universityId },
      select: { id: true },
    })

    if (!existingUniversity) {
      throw new ApiError(404, 'University not found')
    }

    const created = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: payload.email },
      })

      if (existingUser) {
        const existingFaculty = await tx.faculty.findUnique({
          where: { userId: existingUser.id },
        })

        if (existingFaculty) {
          throw new ApiError(409, 'A faculty profile already exists for this email')
        }
      }

      const { firstName, lastName } = splitName(payload.name)
      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            email: payload.email,
            displayName: payload.name,
            firstName,
            lastName,
            role: UserRole.FACULTY,
            canPublishCampusAnnouncements: payload.canPublishCampusAnnouncements,
            department: payload.department,
            universityId: payload.universityId,
          },
        }))

      if (existingUser && existingUser.role === UserRole.STUDENT) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            role: UserRole.FACULTY,
            canPublishCampusAnnouncements: payload.canPublishCampusAnnouncements,
            displayName: payload.name,
            firstName,
            lastName,
            department: payload.department,
            universityId: payload.universityId,
          },
        })
      } else if (existingUser) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            canPublishCampusAnnouncements: payload.canPublishCampusAnnouncements,
          },
        })
      }

      return tx.faculty.create({
        data: {
          userId: user.id,
          universityId: payload.universityId,
          name: payload.name,
          title: payload.title,
          department: payload.department,
          email: payload.email,
          phone: payload.phone,
          officeLocation: payload.officeLocation,
          officeHours: payload.officeHours,
          bio: payload.bio,
          courses: payload.courses,
          tags: payload.tags,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              canPublishCampusAnnouncements: true,
            },
          },
          university: {
            select: { id: true, name: true, slug: true },
          },
        },
      })
    })
    invalidateUniversityData(UNIVERSITY_DATA_TAGS.faculty)

    return successResponse(created, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
