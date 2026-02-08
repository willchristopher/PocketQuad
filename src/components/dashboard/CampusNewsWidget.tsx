'use client'

import Link from 'next/link'
import { AlertCircle, ChevronRight, Megaphone, Newspaper, ShieldCheck } from 'lucide-react'

type NewsItem = {
  id: string
  headline: string
  detail: string
  posted: string
  level: 'Important' | 'Update' | 'Info'
  href: string
}

const newsItems: NewsItem[] = [
  {
    id: 'library-hours',
    headline: 'Library north wing closed through Friday',
    detail: 'Use the south entrance and second-floor study areas.',
    posted: 'Updated 2h ago',
    level: 'Important',
    href: '/notifications',
  },
  {
    id: 'registration',
    headline: 'Priority registration opens next Monday',
    detail: 'Seniors and graduate students can begin at 8:00 AM.',
    posted: 'Posted today',
    level: 'Update',
    href: '/notifications',
  },
  {
    id: 'health-center',
    headline: 'Flu shot clinic available at Student Health',
    detail: 'Walk-ins accepted from 10:00 AM to 4:00 PM this week.',
    posted: 'Posted yesterday',
    level: 'Info',
    href: '/notifications',
  },
]

const levelStyle: Record<NewsItem['level'], { icon: React.ElementType; className: string }> = {
  Important: {
    icon: AlertCircle,
    className: 'bg-red-500/10 text-red-700 dark:text-red-300',
  },
  Update: {
    icon: Megaphone,
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  },
  Info: {
    icon: ShieldCheck,
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
}

export function CampusNewsWidget() {
  return (
    <div className="space-y-2.5">
      {newsItems.map((item) => {
        const config = levelStyle[item.level]
        const Icon = config.icon
        return (
          <Link
            key={item.id}
            href={item.href}
            className="group block rounded-xl border border-border/50 p-3 transition-colors hover:bg-muted/35"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.className}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{item.headline}</p>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.detail}</p>
                <p className="mt-2 text-[11px] font-medium text-muted-foreground">{item.posted}</p>
              </div>
            </div>
          </Link>
        )
      })}
      <Link
        href="/notifications"
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
      >
        <Newspaper className="h-3.5 w-3.5" />
        View all campus updates
      </Link>
    </div>
  )
}
