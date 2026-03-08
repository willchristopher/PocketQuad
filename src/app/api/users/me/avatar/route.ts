import crypto from 'node:crypto'

import { assertRateLimit, withRateLimitHeaders } from '@/lib/api/rateLimit'
import { prisma } from '@/lib/prisma'
import { ApiError, getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

const MAX_SIZE_BYTES = 5 * 1024 * 1024
const MAX_MULTIPART_BYTES = MAX_SIZE_BYTES + 256 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

function getFileExtension(contentType: string) {
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/jpeg') return 'jpg'
  if (contentType === 'image/webp') return 'webp'
  if (contentType === 'image/gif') return 'gif'
  return 'bin'
}

function toStoragePath(publicUrl: string) {
  const marker = '/storage/v1/object/public/avatars/'
  const index = publicUrl.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(publicUrl.slice(index + marker.length))
}

function isPng(buffer: Uint8Array) {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  )
}

function isJpeg(buffer: Uint8Array) {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
}

function isGif(buffer: Uint8Array) {
  if (buffer.length < 6) return false
  const signature = String.fromCharCode(...buffer.slice(0, 6))
  return signature === 'GIF87a' || signature === 'GIF89a'
}

function isWebp(buffer: Uint8Array) {
  if (buffer.length < 12) return false
  const header = String.fromCharCode(...buffer.slice(0, 4))
  const format = String.fromCharCode(...buffer.slice(8, 12))
  return header === 'RIFF' && format === 'WEBP'
}

function matchesDeclaredImageType(contentType: string, buffer: Uint8Array) {
  if (contentType === 'image/png') return isPng(buffer)
  if (contentType === 'image/jpeg') return isJpeg(buffer)
  if (contentType === 'image/gif') return isGif(buffer)
  if (contentType === 'image/webp') return isWebp(buffer)
  return false
}

export async function POST(request: Request) {
  try {
    const { profile } = await getAuthenticatedUser()
    const rateLimit = assertRateLimit({
      key: 'users:me:avatar:upload',
      limit: 5,
      windowMs: 15 * 60_000,
      request,
      identifier: profile.id,
      message: 'Too many avatar uploads. Please wait a bit before trying again.',
    })
    const contentLengthHeader = request.headers.get('content-length')
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : NaN

    if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
      throw new ApiError(400, 'Upload payload is too large')
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      throw new ApiError(400, 'Expected a file field in multipart form data')
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new ApiError(400, 'Only PNG, JPEG, GIF, and WebP images are allowed')
    }

    if (file.size <= 0) {
      throw new ApiError(400, 'Uploaded file is empty')
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new ApiError(400, 'File must be smaller than 5MB')
    }

    if (file.name.length > 120) {
      throw new ApiError(400, 'Filename is too long')
    }

    const buffer = new Uint8Array(await file.arrayBuffer())

    if (!matchesDeclaredImageType(file.type, buffer)) {
      throw new ApiError(400, 'Uploaded file content does not match the declared image type')
    }

    const supabase = createSupabaseAdminClient()
    const path = `${profile.id}/${Date.now()}-${crypto.randomUUID()}.${getFileExtension(file.type)}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
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

    if (profile.avatar) {
      const existingPath = toStoragePath(profile.avatar)
      if (existingPath) {
        await supabase.storage.from('avatars').remove([existingPath])
      }
    }

    return withRateLimitHeaders(successResponse(updatedUser), rateLimit)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const { profile } = await getAuthenticatedUser()
    const rateLimit = assertRateLimit({
      key: 'users:me:avatar:delete',
      limit: 10,
      windowMs: 15 * 60_000,
      request,
      identifier: profile.id,
      message: 'Too many avatar delete requests. Please wait a bit before trying again.',
    })
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

    return withRateLimitHeaders(successResponse(updatedUser), rateLimit)
  } catch (error) {
    return handleApiError(error)
  }
}
