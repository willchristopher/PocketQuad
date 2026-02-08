import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

function getPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return { url, anonKey }
}

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

type CookieToSet = {
  name: string
  value: string
  options?: {
    domain?: string
    path?: string
    maxAge?: number
    expires?: Date
    httpOnly?: boolean
    secure?: boolean
    sameSite?: boolean | 'lax' | 'strict' | 'none'
  }
}

export async function createSupabaseServerClient() {
  const { url, anonKey } = getPublicSupabaseEnv()
  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Ignore in server components where cookie mutation is unavailable.
        }
      },
    },
  })
}

export async function createSupabaseRouteHandlerClient() {
  return createSupabaseServerClient()
}

export function createSupabaseMiddlewareClient(request: NextRequest, response: NextResponse) {
  const { url, anonKey } = getPublicSupabaseEnv()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }: CookieToSet) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })
}

export function createSupabaseAdminClient() {
  const { url } = getPublicSupabaseEnv()
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRole) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
