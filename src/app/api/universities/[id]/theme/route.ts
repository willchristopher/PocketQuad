import { prisma } from '@/lib/prisma'
import { handleApiError, successResponse } from '@/lib/api/utils'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    const university = await prisma.university.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        themeMainColor: true,
        themeAccentColor: true,
      },
    })

    if (!university) {
      return successResponse({ name: null, themeMainColor: null, themeAccentColor: null })
    }

    return successResponse(university)
  } catch (error) {
    return handleApiError(error)
  }
}
