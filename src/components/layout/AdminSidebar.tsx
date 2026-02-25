'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Building2,
  CalendarDays,
  ExternalLink,
  Landmark,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  ShieldUser,
  School,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/context'
import { getAllowedAdminTabs, type AdminTabValue } from '@/lib/auth/portalPermissions'
import { cn } from '@/lib/utils'

type AdminSidebarProps = {
  className?: string
  mobile?: boolean
  onNavigate?: () => void
}

const adminLinks: Array<{ icon: React.ElementType; label: string; tab: AdminTabValue }> = [
  { icon: LayoutDashboard, label: 'Overview', tab: 'overview' },
  { icon: UserCog, label: 'Faculty', tab: 'faculty' },
  { icon: Building2, label: 'Buildings', tab: 'buildings' },
  { icon: ExternalLink, label: 'Resource Links', tab: 'links' },
  { icon: Wrench, label: 'Services', tab: 'services' },
  { icon: Landmark, label: 'Clubs', tab: 'clubs' },
  { icon: CalendarDays, label: 'Events', tab: 'events' },
  { icon: ShieldUser, label: 'IT Accounts', tab: 'it-accounts' },
  { icon: Users, label: 'Users', tab: 'users' },
]

export function AdminSidebar({ className, mobile = false, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { profile, signOut } = useAuth()

  const currentTab = searchParams.get('tab') ?? 'overview'
  const selectedUniversityId = searchParams.get('universityId') ?? ''
  const allowedTabs = React.useMemo(() => {
    if (!profile) return adminLinks.map((item) => item.tab)
    const resolved = getAllowedAdminTabs(profile)
    return resolved.length > 0 ? resolved : ['overview']
  }, [profile])
  const visibleLinks = React.useMemo(
    () => adminLinks.filter((item) => allowedTabs.includes(item.tab)),
    [allowedTabs],
  )
  const defaultTab = visibleLinks[0]?.tab ?? 'overview'

  React.useEffect(() => {
    if (pathname !== '/admin') return
    if (allowedTabs.includes(currentTab as AdminTabValue)) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', defaultTab)
    router.replace(`/admin?${params.toString()}`, { scroll: false })
  }, [allowedTabs, currentTab, defaultTab, pathname, router, searchParams])

  const handleLogout = async () => {
    await signOut()

    onNavigate?.()
    router.push('/login')
    router.refresh()
  }

  const buildAdminHref = React.useCallback(
    (tab: AdminTabValue) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', tab)
      if (selectedUniversityId) {
        params.set('universityId', selectedUniversityId)
      } else {
        params.delete('universityId')
      }
      return `/admin?${params.toString()}`
    },
    [searchParams, selectedUniversityId],
  )

  const handleChangeUniversity = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('universityId')
    params.set('tab', defaultTab)
    onNavigate?.()
    router.replace(`/admin?${params.toString()}`, { scroll: false })
  }

  return (
    <aside
      className={cn(
        mobile
          ? 'flex h-full w-full flex-col border-r border-border/50 bg-card/95 backdrop-blur-xl'
          : 'hidden md:flex fixed left-0 top-0 z-40 h-screen w-[260px] flex-col border-r border-border/50 bg-card/95 backdrop-blur-xl',
        className
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border/50 px-5">
        <Link href={buildAdminHref(defaultTab)} onClick={onNavigate} className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="font-display text-base font-bold tracking-tight">PocketQuad</p>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Admin</p>
          </div>
        </Link>
        <Badge variant="secondary" className="text-[9px] tracking-wide font-medium">
          {profile?.adminAccessLevel?.replaceAll('_', ' ') ?? profile?.role ?? 'ADMIN'}
        </Badge>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 custom-scrollbar">
        {visibleLinks.map((item) => {
          const isActive = pathname === '/admin' && currentTab === item.tab
          const Icon = item.icon
          const href = buildAdminHref(item.tab)

          return (
            <Link
              key={item.tab}
              href={href}
              onClick={onNavigate}
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
      </nav>

      <div className="border-t border-border/50 p-3 space-y-2">
        <div className="rounded-lg bg-muted/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Signed in as</p>
          <p className="truncate text-xs font-medium mt-0.5">{profile?.email ?? 'admin@pocketquad.edu'}</p>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 rounded-lg text-xs h-9"
          onClick={handleChangeUniversity}
          disabled={!selectedUniversityId}
        >
          <School className="h-3.5 w-3.5" />
          Change university
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 rounded-lg text-xs h-9"
          onClick={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </Button>
      </div>
    </aside>
  )
}
