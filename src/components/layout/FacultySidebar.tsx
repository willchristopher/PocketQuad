'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutGrid, LogOut, School } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/lib/auth/context'

const navigationItems = [{ icon: LayoutGrid, label: 'Dashboard', href: '/faculty/dashboard' }]

export function FacultySidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, signOut } = useAuth()

  const displayName = profile?.displayName ?? 'Faculty Member'
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden h-screen w-[240px] flex-col border-r border-border/50 bg-card/95 backdrop-blur-xl md:flex">
      <div className="flex h-14 items-center border-b border-border/50 px-4 lg:px-5">
        <Link href="/faculty/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <School className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-display font-bold tracking-tight text-foreground">
              MyQuad
            </span>
            <span className="text-[10px] text-muted-foreground font-medium -mt-0.5">Faculty</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-auto px-3 py-4 custom-scrollbar">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border/50 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start px-2 hover:bg-muted/80 rounded-xl">
              <div className="flex items-center gap-3 text-left">
                <Avatar className="h-8 w-8 rounded-xl">
                  <AvatarImage src={profile?.avatar ?? undefined} alt={displayName} />
                  <AvatarFallback className="rounded-xl text-xs">{initials || 'FM'}</AvatarFallback>
                </Avatar>
                <div className="grid gap-0.5 text-xs">
                  <span className="font-semibold truncate">{displayName}</span>
                  <span className="text-muted-foreground truncate">{profile?.email ?? 'faculty@myquad.edu'}</span>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded-xl" align="end" forceMount>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
