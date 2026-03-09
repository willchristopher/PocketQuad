'use client'

import React from 'react'
import type { User } from '@supabase/supabase-js'

import { apiRequest } from '@/lib/api/client'
import type { DashboardModuleId } from '@/lib/studentData'
import {
  type AdminAccessLevel,
  type PortalPermission,
} from '@/lib/auth/portalPermissions'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type UserProfile = {
  id: string
  email: string
  displayName: string
  firstName: string
  lastName: string
  avatar: string | null
  role: 'STUDENT' | 'FACULTY' | 'ADMIN'
  adminAccessLevel: AdminAccessLevel | null
  portalPermissions: PortalPermission[]
  universityId: string | null
  university?: { id: string; name: string; domain: string | null } | null
  managedClubs?: Array<{
    clubId: string
    club: { id: string; universityId: string; name: string }
  }>
  bio: string | null
  location: string | null
  website: string | null
  major: string | null
  department: string | null
  year: string | null
  notificationPreferences?: {
    officeHourChanges: boolean
    newEvents: boolean
    eventReminders: boolean
    deadlineReminders: boolean
    emailDigest: boolean
    pushEnabled: boolean
    theme: 'system' | 'light' | 'dark' | 'university'
    buildingAlerts: boolean
    buildingIds: string[]
    clubInterestIds: string[]
    dashboardModules: DashboardModuleId[]
  } | null
  onboardingComplete: boolean
}

type AuthSessionPayload = {
  session: unknown | null
  user: User | null
  profile: UserProfile | null
}

type AuthContextValue = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

function hasSupabaseClientEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [loading, setLoading] = React.useState(true)

  const fetchSession = React.useCallback(async () => {
    try {
      const data = await apiRequest<AuthSessionPayload>('/api/auth/session')
      setUser(data.user)
      setProfile(data.profile)
    } catch {
      setUser(null)
      setProfile(null)
    }
  }, [])

  React.useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      try {
        await fetchSession()
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void bootstrap()

    if (!hasSupabaseClientEnv()) {
      return () => {
        mounted = false
      }
    }

    const supabase = createSupabaseBrowserClient()
    const { data } = supabase.auth.onAuthStateChange(() => {
      void fetchSession()
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [fetchSession])

  const refreshProfile = React.useCallback(async () => {
    const nextProfile = await apiRequest<UserProfile>('/api/users/me')
    setProfile(nextProfile)
  }, [])

  const signOut = React.useCallback(async () => {
    try {
      await apiRequest<{ success: boolean }>('/api/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
      setProfile(null)
    }
  }, [])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      signOut,
      refreshProfile,
    }),
    [loading, profile, refreshProfile, signOut, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
