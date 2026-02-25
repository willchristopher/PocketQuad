import { NextRequest } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'

const onboardingCompleteSchema = z.object({
  /** Student: IDs of favorited faculty */
  favoriteFacultyIds: z.array(z.string()).optional().default([]),
  /** Student: enable building closure alerts */
  buildingAlerts: z.boolean().optional().default(false),
  /** Student: building IDs to get alerts for */
  buildingIds: z.array(z.string()).optional().default([]),
  /** Student: club IDs the student is interested in */
  clubInterestIds: z.array(z.string()).optional().default([]),
  /** Both: theme preference */
  theme: z.enum(['system', 'light', 'dark', 'university']).optional().default('system'),
  /** Faculty: office hours to create */
  officeHours: z
    .array(
      z.object({
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string(),
        endTime: z.string(),
        location: z.string().optional().default(''),
        mode: z.enum(['IN_PERSON', 'VIRTUAL', 'HYBRID']).optional().default('IN_PERSON'),
      }),
    )
    .optional()
    .default([]),
})

export async function POST(request: NextRequest) {
  try {
    const { profile } = await getAuthenticatedUser()
    const payload = onboardingCompleteSchema.parse(await request.json())

    // Use a transaction to do everything atomically
    await prisma.$transaction(async (tx) => {
      // 1. Mark onboarding complete
      await tx.user.update({
        where: { id: profile.id },
        data: { onboardingComplete: true },
      })

      // 2. Upsert notification preferences (theme + building alerts)
      await tx.notificationPreferences.upsert({
        where: { userId: profile.id },
        update: {
          theme: payload.theme,
          buildingAlerts: payload.buildingAlerts,
          buildingIds: payload.buildingIds,
          clubInterestIds: payload.clubInterestIds,
        },
        create: {
          userId: profile.id,
          theme: payload.theme,
          buildingAlerts: payload.buildingAlerts,
          buildingIds: payload.buildingIds,
          clubInterestIds: payload.clubInterestIds,
        },
      })

      // 3. Student: create faculty favorites
      if (profile.role === 'STUDENT' && payload.favoriteFacultyIds.length > 0) {
        // Remove existing favorites first to avoid duplicates
        await tx.facultyFavorite.deleteMany({
          where: { userId: profile.id },
        })
        await tx.facultyFavorite.createMany({
          data: payload.favoriteFacultyIds.map((facultyId) => ({
            userId: profile.id,
            facultyId,
          })),
        })
      }

      // 4. Faculty: create office hours
      if (profile.role === 'FACULTY' && payload.officeHours.length > 0) {
        // Get the faculty record
        const faculty = await tx.faculty.findFirst({
          where: { userId: profile.id },
        })

        if (faculty) {
          await tx.officeHour.createMany({
            data: payload.officeHours.map((oh) => ({
              userId: profile.id,
              facultyId: faculty.id,
              dayOfWeek: oh.dayOfWeek,
              startTime: oh.startTime,
              endTime: oh.endTime,
              location: oh.location,
              mode: oh.mode,
            })),
          })
        }
      }
    })

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
