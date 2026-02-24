import { handleApiError, successResponse } from '@/lib/api/utils'
import { getUniversityThemeCached } from '@/lib/server/universityData'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    const university = await getUniversityThemeCached(id)

    if (!university) {
      return successResponse({ name: null, themeMainColor: null, themeAccentColor: null })
    }

    return successResponse(university)
  } catch (error) {
    return handleApiError(error)
  }
}
