'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  Flag,
  LayoutGrid,
  LogOut,
  MapPinned,
  MessageCircleMore,
  UserCircle2,
  Users2,
  BellRing,
  CalendarClock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/context'
import { useSidebarCollapsed } from '@/components/layout/SidebarContext'
import { useRouter } from 'next/navigation'
import React from 'react'

type NavItem = {
  icon: React.ElementType
  label: string
  href: string
}

type NavSection = {
  title: string | null
  items: NavItem[]
}

const sections: NavSection[] = [
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

const bottomItems: NavItem[] = [
  { icon: BellRing, label: 'Notifications', href: '/notifications' },
  { icon: UserCircle2, label: 'Profile', href: '/profile' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({})
  const { sidebarCollapsed, toggleSidebar } = useSidebarCollapsed()

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  return (
    <aside
      className={cn(
        'hidden md:flex fixed left-0 top-0 z-40 h-screen flex-col border-r border-border/50 bg-card/95 backdrop-blur-xl transition-[width] duration-200',
        sidebarCollapsed ? 'w-[68px]' : 'w-[260px]',
      )}
    >
      <div className="flex h-14 items-center border-b border-border/50 px-3">
        <Link href="/dashboard" className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center w-full')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <LayoutGrid className="h-4 w-4" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <p className="font-display text-base font-bold tracking-tight text-foreground">MyQuad</p>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Student Hub</p>
            </div>
          )}
        </Link>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[42px] z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft className={cn('h-3.5 w-3.5 transition-transform duration-200', sidebarCollapsed && 'rotate-180')} />
      </button>

      <nav className="flex-1 overflow-y-auto px-2 pt-3 pb-1 custom-scrollbar">
        {sections.map((section, sectionIndex) => {
          const isSectionCollapsed = section.title ? collapsed[section.title] : false

          return (
            <div key={sectionIndex} className={cn(section.title && 'mt-4')}>
              {section.title && !sidebarCollapsed && (
                <button
                  onClick={() => toggleSection(section.title!)}
                  className="flex w-full items-center justify-between px-3 mb-1"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {section.title}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 text-muted-foreground/50 transition-transform duration-200',
                      isSectionCollapsed && '-rotate-90',
                    )}
                  />
                </button>
              )}
              {!isSectionCollapsed && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname?.startsWith(item.href + '/') ||
                      (item.href === '/dashboard' && pathname === '/') ||
                      (item.href === '/campus-map' && pathname === '/services-status')
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={cn(
                          'group relative flex items-center rounded-lg text-[13px] font-medium transition-colors duration-150',
                          sidebarCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                        )}
                        <Icon className="h-4 w-4 shrink-0" />
                        {!sidebarCollapsed && <span>{item.label}</span>}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-border/50 px-2 py-2 space-y-0.5">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                'group relative flex items-center rounded-lg text-[13px] font-medium transition-colors duration-150',
                sidebarCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
        <button
          onClick={() => { void handleLogout() }}
          title={sidebarCollapsed ? 'Log Out' : undefined}
          className={cn(
            'group flex w-full items-center rounded-lg text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400',
            sidebarCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  )
}
