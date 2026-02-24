'use client'

import React from 'react'
import Link from 'next/link'
import { Bell, Moon, Palette, Sun } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { apiRequest } from '@/lib/api/client'
import { subscribeToNotifications } from '@/lib/supabase/realtime'
import { useUniversityTheme, type ThemeMode } from '@/lib/theme'

function getPageTitle(pathname: string | null) {
  if (!pathname || pathname === '/dashboard' || pathname === '/') return 'Dashboard'
  if (pathname === '/calendar') return 'Calendar'
  if (pathname === '/events' || pathname.startsWith('/events/')) return 'Events'
  if (pathname.startsWith('/faculty-directory')) return 'Faculty'
  if (pathname === '/chatroom') return 'Chat'
  if (pathname === '/campus-map') return 'Map & Services'
  if (pathname === '/services-status') return 'Services'
  if (pathname === '/links-directory') return 'Resources'
  if (pathname === '/clubs') return 'Clubs'
  if (pathname === '/notifications') return 'Notifications'
  if (pathname === '/profile') return 'Profile'
  return 'PocketQuad'
}

export function Header() {
  const pathname = usePathname()
  const { profile } = useAuth()
  const { themeMode, setThemeMode, universityColors, universityName } = useUniversityTheme()
  const [mounted, setMounted] = React.useState(false)
  const [unreadCount, setUnreadCount] = React.useState(0)

  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (!profile?.id) {
      setUnreadCount(0)
      return
    }

    let active = true
    const loadUnreadCount = async () => {
      try {
        const result = await apiRequest<{ count: number }>('/api/notifications?unread=true&countOnly=true')
        if (active) {
          setUnreadCount(result.count)
        }
      } catch {
        if (active) {
          setUnreadCount(0)
        }
      }
    }

    void loadUnreadCount()
    const realtime = subscribeToNotifications(profile.id, () => {
      void loadUnreadCount()
    })

    return () => {
      active = false
      void realtime.unsubscribe()
    }
  }, [profile?.id])

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between gap-4 border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <div className="min-w-0">
        <h2 className="truncate font-display text-base font-semibold tracking-tight text-foreground">
          {getPageTitle(pathname)}
        </h2>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => {
            const cycle: ThemeMode[] = universityColors
              ? ['light', 'dark', 'university']
              : ['light', 'dark']
            const idx = cycle.indexOf(themeMode)
            setThemeMode(cycle[(idx + 1) % cycle.length])
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          aria-label={`Theme: ${themeMode}. Click to switch.`}
          title={
            !mounted
              ? 'Toggle theme'
              : themeMode === 'light'
                ? 'Light mode'
                : themeMode === 'dark'
                  ? 'Dark mode'
                  : `${universityName ?? 'University'} theme`
          }
        >
          {!mounted ? (
            <Sun className="h-4 w-4" />
          ) : themeMode === 'light' ? (
            <Sun className="h-4 w-4" />
          ) : themeMode === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Palette className="h-4 w-4" />
          )}
        </button>

        <Link
          href="/notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </Link>
      </div>
    </header>
  )
}
