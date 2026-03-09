'use client'

import React from 'react'
import Link from 'next/link'
import {
  Bell,
  BellRing,
  CalendarClock,
  CalendarRange,
  ExternalLink,
  Flag,
  LayoutGrid,
  LogOut,
  MapPinned,
  Menu,
  MessageCircleMore,
  Moon,
  Palette,
  Search,
  Sun,
  UserCircle2,
  Users2,
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { apiRequest } from '@/lib/api/client'
import { subscribeToNotifications } from '@/lib/supabase/realtime'
import { useUniversityTheme, type ThemeMode } from '@/lib/theme'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const navSections = [
  {
    title: null,
    items: [
      { icon: LayoutGrid, label: 'Dashboard', href: '/dashboard' },
      { icon: CalendarRange, label: 'Calendar', href: '/calendar' },
    ],
  },
  {
    title: 'Campus',
    items: [
      { icon: Users2, label: 'Faculty', href: '/faculty-directory' },
      { icon: CalendarClock, label: 'Events', href: '/events' },
      { icon: MapPinned, label: 'Map & Services', href: '/campus-map' },
      { icon: ExternalLink, label: 'Resources', href: '/links-directory' },
    ],
  },
  {
    title: 'Connect',
    items: [
      { icon: MessageCircleMore, label: 'Chat', href: '/chatroom' },
      { icon: Flag, label: 'Clubs', href: '/clubs' },
    ],
  },
]

const navBottomItems = [
  { icon: BellRing, label: 'Notifications', href: '/notifications' },
  { icon: UserCircle2, label: 'Profile', href: '/profile' },
]

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
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const { themeMode, setThemeMode, universityColors, universityName } = useUniversityTheme()
  const [mounted, setMounted] = React.useState(false)
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const handleSignOut = async () => {
    setSheetOpen(false)
    await signOut()
    router.push('/login')
  }

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
      <div className="flex min-w-0 items-center gap-2">
        {/* Mobile hamburger — opens full nav sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-[280px] flex-col p-0">
            <div className="flex items-center gap-2 border-b border-border/50 px-4 py-4">
              <span className="font-display text-base font-semibold tracking-tight">PocketQuad</span>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-2">
              {navSections.map((section, i) => (
                <div key={i} className="mb-1">
                  {section.title && (
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {section.title}
                    </p>
                  )}
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive =
                      pathname?.startsWith(item.href) ||
                      (item.href === '/dashboard' && pathname === '/')
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSheetOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>
            <div className="border-t border-border/50 px-2 py-2">
              {navBottomItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname?.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSheetOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
              <button
                onClick={() => void handleSignOut()}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </button>
            </div>
          </SheetContent>
        </Sheet>

        <h2 className="truncate font-display text-base font-semibold tracking-tight text-foreground">
          {getPageTitle(pathname)}
        </h2>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Mobile search — triggers the CommandPalette keyboard shortcut listener */}
        <button
          onClick={() =>
            document.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
            )
          }
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground md:hidden"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

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
