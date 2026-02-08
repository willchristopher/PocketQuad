'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bot,
  CalendarRange,
  ChevronDown,
  ExternalLink,
  Flag,
  LayoutGrid,
  MapPinned,
  MessageCircleMore,
  UserCircle2,
  Users2,
  BellRing,
  CalendarClock,
  Compass,
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
      { icon: Bot, label: 'AI Advisor', href: '/advisor' },
    ],
  },
]

const bottomItems: NavItem[] = [
  { icon: BellRing, label: 'Notifications', href: '/notifications' },
  { icon: UserCircle2, label: 'Profile', href: '/profile' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({})

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  return (
    <aside className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-[260px] flex-col border-r border-border/50 bg-card/95 backdrop-blur-xl">
      <div className="flex h-14 items-center border-b border-border/50 px-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <div>
            <p className="font-display text-base font-bold tracking-tight text-foreground">MyQuad</p>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Student Hub</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pt-3 pb-1 custom-scrollbar">
        {sections.map((section, sectionIndex) => {
          const isCollapsed = section.title ? collapsed[section.title] : false

          return (
            <div key={sectionIndex} className={cn(section.title && 'mt-4')}>
              {section.title && (
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
                      isCollapsed && '-rotate-90',
                    )}
                  />
                </button>
              )}
              {!isCollapsed && (
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
                        className={cn(
                          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                        )}
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-border/50 px-3 py-2 space-y-0.5">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
