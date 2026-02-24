import { NextRequest } from 'next/server'

import { handleApiError, successResponse } from '@/lib/api/utils'
import { registerUser } from '@/lib/auth/registerUser'

export async function POST(request: NextRequest) {
  try {
    const data = await registerUser(await request.json())
    return successResponse(data, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
