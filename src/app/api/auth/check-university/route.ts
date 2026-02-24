import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { handleApiError, successResponse } from '@/lib/api/utils'

export async function GET(request: NextRequest) {
  try {
    const domain = request.nextUrl.searchParams.get('domain')

    if (!domain) {
      return successResponse({ university: null })
    }

    const university = await prisma.university.findFirst({
      where: { domain: domain.toLowerCase() },
      select: { id: true, name: true },
    })

    return successResponse({ university })
  } catch (error) {
    return handleApiError(error)
  }
}
