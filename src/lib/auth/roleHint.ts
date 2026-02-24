import type { NextResponse } from 'next/server'

export type AppRole = 'STUDENT' | 'FACULTY' | 'ADMIN'

type RoleHintPayload = {
  sub: string
  role: AppRole
  exp: number
  iat: number
}

type RoleHintHeader = {
  alg: string
  typ: string
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const ROLE_HINT_COOKIE_NAME = 'myquad-role-hint'
export const ROLE_HINT_TTL_SECONDS = 15 * 60

function getRoleHintSecret() {
  return process.env.APP_JWT_SECRET || null
}

function toBase64Url(value: string) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (normalized.length % 4)) % 4
  return atob(normalized.padEnd(normalized.length + padding, '='))
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index])
  }
  return toBase64Url(binary)
}

function base64UrlToBytes(value: string) {
  const binary = fromBase64Url(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let result = 0
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return result === 0
}

async function sign(data: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return bytesToBase64Url(new Uint8Array(signature))
}

function parsePayload(value: string): RoleHintPayload | null {
  try {
    const parsed = JSON.parse(value) as RoleHintPayload
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.sub !== 'string') return null
    if (parsed.role !== 'STUDENT' && parsed.role !== 'FACULTY' && parsed.role !== 'ADMIN') return null
    if (typeof parsed.exp !== 'number' || typeof parsed.iat !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

function parseHeader(value: string): RoleHintHeader | null {
  try {
    const parsed = JSON.parse(value) as RoleHintHeader
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.alg !== 'HS256' || parsed.typ !== 'JWT') return null
    return parsed
  } catch {
    return null
  }
}

export async function createRoleHintToken(
  supabaseUserId: string,
  role: AppRole,
  now: Date = new Date(),
) {
  const secret = getRoleHintSecret()
  if (!secret) return null

  const iat = Math.floor(now.getTime() / 1000)
  const payload: RoleHintPayload = {
    sub: supabaseUserId,
    role,
    iat,
    exp: iat + ROLE_HINT_TTL_SECONDS,
  }

  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)))
  const signingInput = `${header}.${body}`
  const signature = await sign(signingInput, secret)

  return `${signingInput}.${signature}`
}

export async function verifyRoleHintToken(
  token: string | undefined,
  expectedSupabaseUserId: string,
  now: Date = new Date(),
) {
  if (!token) return null

  const secret = getRoleHintSecret()
  if (!secret) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [headerPart, payloadPart, signaturePart] = parts
  if (!headerPart || !payloadPart || !signaturePart) return null

  const signingInput = `${headerPart}.${payloadPart}`
  const expectedSignature = await sign(signingInput, secret)
  if (!constantTimeEqual(expectedSignature, signaturePart)) return null

  let headerRaw = ''
  let payloadRaw = ''
  try {
    const headerBytes = base64UrlToBytes(headerPart)
    headerRaw = decoder.decode(headerBytes)
    const payloadBytes = base64UrlToBytes(payloadPart)
    payloadRaw = decoder.decode(payloadBytes)
  } catch {
    return null
  }

  const header = parseHeader(headerRaw)
  if (!header) return null

  const payload = parsePayload(payloadRaw)

  if (!payload) return null
  if (payload.sub !== expectedSupabaseUserId) return null

  const currentTimestamp = Math.floor(now.getTime() / 1000)
  if (payload.exp <= currentTimestamp) return null

  return payload.role
}

export function setRoleHintCookie(response: NextResponse, token: string) {
  response.cookies.set(ROLE_HINT_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ROLE_HINT_TTL_SECONDS,
  })
}
