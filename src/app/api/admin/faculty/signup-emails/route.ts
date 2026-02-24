import { NextRequest } from 'next/server'
import type { AdminAccessLevel } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils'
import { adminFacultySignupEmailCreateSchema } from '@/lib/validations/admin'

function isOwnerAccount(profile: {
  role: 'STUDENT' | 'FACULTY' | 'ADMIN'
  adminAccessLevel: AdminAccessLevel | null
}) {
  return (
    profile.adminAccessLevel === 'OWNER' ||
    (profile.role === 'ADMIN' && profile.adminAccessLevel == null)
  )
}

function splitLocalPart(localPart: string) {
  const normalized = localPart.replace(/[^a-zA-Z0-9]+/g, ' ').trim()
  const parts = normalized.split(/\s+/).filter(Boolean)
  const firstName = parts[0] ? `${parts[0][0].toUpperCase()}${parts[0].slice(1)}` : 'Faculty'
  const remaining = parts.slice(1)
  const lastName = remaining.length > 0
    ? remaining.map((part) => `${part[0].toUpperCase()}${part.slice(1)}`).join(' ')
    : 'Member'

  return { firstName, lastName }
}

function deriveNameFromEmail(email: string) {
  const localPart = email.split('@')[0] ?? ''
  return splitLocalPart(localPart)
}

export async function GET(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedAdmin('ADMIN_TAB_FACULTY')
    const isOwner = isOwnerAccount(profile)
    const requestedUniversityId = request.nextUrl.searchParams.get('universityId') ?? undefined

    if (!isOwner && requestedUniversityId && requestedUniversityId !== profile.universityId) {
      throw new ApiError(
        403,
        'You can only view faculty signup emails for your own university',
      )
    }

    const scopedUniversityId = isOwner
      ? requestedUniversityId
      : profile.universityId ?? requestedUniversityId

    const records = await prisma.user.findMany({
      where: {
        role: 'FACULTY',
        facultyProfile: null,
        ...(scopedUniversityId ? { universityId: scopedUniversityId } : {}),
      },
      select: {
        id: true,
        universityId: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        emailVerified: true,
        createdAt: true,
        canPublishCampusAnnouncements: true,
        managesAllClubs: true,
        facultyRoleTags: true,
        managedBuildings: {
          select: {
            buildingId: true,
            building: { select: { id: true, name: true } },
          },
        },
        managedClubs: {
          select: {
            clubId: true,
            club: { select: { id: true, name: true } },
          },
        },
        university: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    })

    return successResponse(records)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedAdmin('ADMIN_TAB_FACULTY')
    const payload = adminFacultySignupEmailCreateSchema.parse(await request.json())
    const isOwner = isOwnerAccount(profile)

    if (!isOwner && payload.universityId !== profile.universityId) {
      throw new ApiError(
        403,
        'You can only add faculty signup emails for your own university',
      )
    }

    const university = await prisma.university.findUnique({
      where: { id: payload.universityId },
      select: { id: true, name: true, slug: true },
    })

    if (!university) {
      throw new ApiError(404, 'University not found')
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email },
      include: {
        facultyProfile: {
          select: { id: true },
        },
      },
    })

    const fallbackName = deriveNameFromEmail(payload.email)
    const firstName = payload.firstName ?? fallbackName.firstName
    const lastName = payload.lastName ?? fallbackName.lastName
    const displayName = `${firstName} ${lastName}`.trim()

    if (existingUser && existingUser.role !== 'FACULTY') {
      throw new ApiError(409, 'This email is already in use by a non-faculty account')
    }

    if (existingUser && existingUser.facultyProfile) {
      throw new ApiError(409, 'A faculty profile already exists for this email')
    }

    if (existingUser) {
      const updated = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            universityId: payload.universityId,
            firstName,
            lastName,
            displayName,
            canPublishCampusAnnouncements: payload.canPublishCampusAnnouncements,
            managesAllClubs: payload.managesAllClubs,
            facultyRoleTags: payload.facultyRoleTags,
          },
          select: {
            id: true,
            universityId: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true,
            emailVerified: true,
            createdAt: true,
            canPublishCampusAnnouncements: true,
            managesAllClubs: true,
            facultyRoleTags: true,
            university: {
              select: { id: true, name: true, slug: true },
            },
          },
        })

        if (payload.managedBuildingIds.length > 0) {
          await tx.buildingManagerAssignment.deleteMany({ where: { userId: user.id } })
          await tx.buildingManagerAssignment.createMany({
            data: payload.managedBuildingIds.map((buildingId) => ({ userId: user.id, buildingId })),
            skipDuplicates: true,
          })
        }

        if (payload.managedClubIds.length > 0) {
          await tx.clubManagerAssignment.deleteMany({ where: { userId: user.id } })
          await tx.clubManagerAssignment.createMany({
            data: payload.managedClubIds.map((clubId) => ({ userId: user.id, clubId })),
            skipDuplicates: true,
          })
        }

        return user
      })

      return successResponse(updated)
    }

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          universityId: payload.universityId,
          email: payload.email,
          firstName,
          lastName,
          displayName,
          role: 'FACULTY',
          canPublishCampusAnnouncements: payload.canPublishCampusAnnouncements,
          managesAllClubs: payload.managesAllClubs,
          facultyRoleTags: payload.facultyRoleTags,
        },
        select: {
          id: true,
          universityId: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          emailVerified: true,
          createdAt: true,
          canPublishCampusAnnouncements: true,
          managesAllClubs: true,
          facultyRoleTags: true,
          university: {
            select: { id: true, name: true, slug: true },
          },
        },
      })

      await tx.notificationPreferences.create({
        data: {
          userId: user.id,
        },
      })

      if (payload.managedBuildingIds.length > 0) {
        await tx.buildingManagerAssignment.createMany({
          data: payload.managedBuildingIds.map((buildingId) => ({ userId: user.id, buildingId })),
          skipDuplicates: true,
        })
      }

      if (payload.managedClubIds.length > 0) {
        await tx.clubManagerAssignment.createMany({
          data: payload.managedClubIds.map((clubId) => ({ userId: user.id, clubId })),
          skipDuplicates: true,
        })
      }

      return user
    })

    return successResponse(created, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
