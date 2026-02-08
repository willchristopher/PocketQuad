'use client'

import Link from 'next/link'
import { BookOpen, CalendarDays, ChevronRight, GraduationCap, Users } from 'lucide-react'

type FavoriteItem = {
  id: string
  label: string
  context: string
  href: string
  icon: React.ElementType
}

const favoriteItems: FavoriteItem[] = [
  {
    id: 'course-hub',
    label: 'Course Hub',
    context: 'Quick access to assignments and materials',
    href: '/calendar',
    icon: GraduationCap,
  },
  {
    id: 'advisor',
    label: 'Dr. Sarah Chen',
    context: 'Office hours and advising notes',
    href: '/faculty-directory/1',
    icon: Users,
  },
  {
    id: 'events',
    label: 'Saved Campus Events',
    context: 'Career and social events you marked',
    href: '/events',
    icon: CalendarDays,
  },
  {
    id: 'study-space',
    label: 'Library Study Planner',
    context: 'Reserve rooms and find open spaces',
    href: '/notifications',
    icon: BookOpen,
  },
]

export function StudentFavoritesWidget() {
  return (
    <ul className="space-y-2.5">
      {favoriteItems.map((item) => {
        const Icon = item.icon
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className="group flex items-center gap-3 rounded-xl border border-border/40 bg-muted/25 p-3 transition-colors hover:bg-muted/55"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
                <p className="truncate text-xs text-muted-foreground">{item.context}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
