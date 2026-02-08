'use client'

import { Bell, Menu, Moon, Search, Sun } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'

const tabConfig: Record<string, { title: string; subtitle: string }> = {
  overview: {
    title: 'Overview',
    subtitle: 'Monitor tenant-level data coverage and content health.',
  },
  universities: {
    title: 'Universities',
    subtitle: 'Create and configure tenant universities and domain mapping.',
  },
  faculty: {
    title: 'Faculty',
    subtitle: 'Create and manage university-scoped faculty profiles.',
  },
  buildings: {
    title: 'Buildings',
    subtitle: 'Manage campus map locations and facility metadata.',
  },
  links: {
    title: 'Resource Links',
    subtitle: 'Maintain external links shown in student directories.',
  },
  services: {
    title: 'Services',
    subtitle: 'Update service status cards and directions links.',
  },
  clubs: {
    title: 'Clubs & Orgs',
    subtitle: 'Manage campus organizations by university.',
  },
  events: {
    title: 'Events',
    subtitle: 'Publish and maintain student-facing campus events.',
  },
}

type AdminHeaderProps = {
  onMenuClick: () => void
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const searchParams = useSearchParams()
  const { theme, setTheme } = useTheme()
  const activeTab = searchParams.get('tab') ?? 'overview'
  const content = tabConfig[activeTab] ?? tabConfig.overview

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden rounded-lg h-8 w-8" onClick={onMenuClick}>
          <Menu className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-display font-semibold tracking-tight">{content.title}</h1>
          <p className="hidden truncate text-[11px] text-muted-foreground md:block">{content.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="relative hidden w-[240px] lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search..."
            className="w-full rounded-lg border border-border/60 bg-muted/30 py-1.5 pl-9 pr-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-lg h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
        <Button variant="ghost" size="icon" className="relative rounded-lg h-8 w-8 text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </Button>
      </div>
    </header>
  )
}
