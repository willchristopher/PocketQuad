import { ApiError, handleApiError } from '@/lib/api/utils'

export async function POST(request: Request) {
  try {
    void request
    throw new ApiError(403, 'Profile photos are disabled')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: Request) {
  try {
    void request
    throw new ApiError(403, 'Profile photos are disabled')
  } catch (error) {
    return handleApiError(error)
  }
}
