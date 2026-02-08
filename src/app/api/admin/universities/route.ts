import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils'
import { universityCreateSchema } from '@/lib/validations/admin'
import { slugifyUniversityName } from '@/lib/university'

export async function GET() {
  try {
    await getAuthenticatedAdmin()

    const universities = await prisma.university.findMany({
      include: {
        _count: {
          select: {
            users: true,
            faculties: true,
            events: true,
            buildings: true,
            resourceLinks: true,
            services: true,
            clubs: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return successResponse(universities)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedAdmin()
    const payload = universityCreateSchema.parse(await request.json())

    const university = await prisma.university.create({
      data: {
        name: payload.name,
        slug: payload.slug ?? slugifyUniversityName(payload.name),
        domain: payload.domain,
      },
    })

    return successResponse(university, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
