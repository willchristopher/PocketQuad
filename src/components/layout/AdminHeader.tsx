'use client'

import { Menu, Moon, Sun } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'

const tabConfig: Record<string, { title: string; subtitle: string }> = {
  overview: {
    title: 'Overview',
    subtitle: 'Monitor university data coverage and content health.',
  },
  faculty: {
    title: 'Faculty',
    subtitle: 'Invite faculty and manage directory profiles and access.',
  },
  buildings: {
    title: 'Buildings',
    subtitle: 'Manage campus map locations, operating status, and facility metadata.',
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
  'it-accounts': {
    title: 'IT Accounts',
    subtitle: 'Provision portal accounts and control role-based tab permissions.',
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
          <p className="truncate text-[11px] text-muted-foreground">{content.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-lg h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  )
}
