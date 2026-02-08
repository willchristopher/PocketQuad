import { prisma } from '@/lib/prisma'
import { ApiError, getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

const MAX_SIZE_BYTES = 5 * 1024 * 1024

function toStoragePath(publicUrl: string) {
  const marker = '/storage/v1/object/public/avatars/'
  const index = publicUrl.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(publicUrl.slice(index + marker.length))
}

export async function POST(request: Request) {
  try {
    const { profile } = await getAuthenticatedUser()
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      throw new ApiError(400, 'Expected a file field in multipart form data')
    }

    if (!file.type.startsWith('image/')) {
      throw new ApiError(400, 'Only image uploads are allowed')
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new ApiError(400, 'File must be smaller than 5MB')
    }

    const supabase = createSupabaseAdminClient()

    if (profile.avatar) {
      const existingPath = toStoragePath(profile.avatar)
      if (existingPath) {
        await supabase.storage.from('avatars').remove([existingPath])
      }
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${profile.id}/${Date.now()}-${sanitizedName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      throw new ApiError(400, uploadError.message)
    }

    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path)

    const updatedUser = await prisma.user.update({
      where: { id: profile.id },
      data: {
        avatar: publicData.publicUrl,
      },
    })

    return successResponse(updatedUser)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE() {
  try {
    const { profile } = await getAuthenticatedUser()
    const supabase = createSupabaseAdminClient()

    if (profile.avatar) {
      const path = toStoragePath(profile.avatar)
      if (path) {
        await supabase.storage.from('avatars').remove([path])
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: profile.id },
      data: {
        avatar: null,
      },
    })

    return successResponse(updatedUser)
  } catch (error) {
    return handleApiError(error)
  }
}
