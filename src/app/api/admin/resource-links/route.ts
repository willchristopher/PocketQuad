import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils'
import { campusResourceLinkCreateSchema } from '@/lib/validations/admin'

export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedAdmin()
    const universityId = request.nextUrl.searchParams.get('universityId') ?? undefined

    const records = await prisma.campusResourceLink.findMany({
      where: {
        ...(universityId ? { universityId } : {}),
      },
      include: {
        university: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: [{ university: { name: 'asc' } }, { category: 'asc' }, { label: 'asc' }],
    })

    return successResponse(records)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedAdmin()
    const payload = campusResourceLinkCreateSchema.parse(await request.json())

    const university = await prisma.university.findUnique({
      where: { id: payload.universityId },
      select: { id: true },
    })

    if (!university) {
      throw new ApiError(404, 'University not found')
    }

    const record = await prisma.campusResourceLink.create({
      data: payload,
      include: {
        university: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    return successResponse(record, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
