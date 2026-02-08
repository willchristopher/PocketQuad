import { handleApiError, successResponse } from '@/lib/api/utils'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createSupabaseRouteHandlerClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
