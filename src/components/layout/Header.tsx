'use client'

import React from 'react'
import Link from 'next/link'
import { Bell, Moon, Search, Sun } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAuth } from '@/lib/auth/context'
import { apiRequest } from '@/lib/api/client'
import { subscribeToNotifications } from '@/lib/supabase/realtime'

function getPageTitle(pathname: string | null) {
  if (!pathname || pathname === '/dashboard' || pathname === '/') return 'Dashboard'
  if (pathname === '/calendar') return 'Calendar'
  if (pathname === '/events' || pathname.startsWith('/events/')) return 'Events'
  if (pathname.startsWith('/faculty-directory')) return 'Faculty'
  if (pathname === '/advisor') return 'AI Advisor'
  if (pathname === '/chatroom') return 'Chat'
  if (pathname === '/campus-map') return 'Map & Services'
  if (pathname === '/services-status') return 'Services'
  if (pathname === '/links-directory') return 'Resources'
  if (pathname === '/clubs') return 'Clubs'
  if (pathname === '/notifications') return 'Notifications'
  if (pathname === '/profile') return 'Profile'
  return 'MyQuad'
}

export function Header() {
  const pathname = usePathname()
  const { profile } = useAuth()
  const { theme, setTheme } = useTheme()
  const [unreadCount, setUnreadCount] = React.useState(0)

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

  const openCommandPalette = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }))
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between gap-4 border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <div className="min-w-0">
        <h2 className="truncate font-display text-base font-semibold tracking-tight text-foreground">
          {getPageTitle(pathname)}
        </h2>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={openCommandPalette}
          className="hidden items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground md:flex"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
          <kbd className="rounded border border-border/60 bg-background px-1 py-0.5 text-[10px]">⌘K</kbd>
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
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
