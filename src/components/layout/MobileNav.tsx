'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, CalendarRange, LayoutGrid, MessageCircleMore, UserCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const mobileNavItems = [
  { icon: LayoutGrid, label: 'Home', href: '/dashboard' },
  { icon: CalendarRange, label: 'Calendar', href: '/calendar' },
  { icon: MessageCircleMore, label: 'Chat', href: '/chatroom' },
  { icon: Bot, label: 'Advisor', href: '/advisor' },
  { icon: UserCircle2, label: 'Profile', href: '/profile' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="h-4 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      <nav
        className="glass-card mx-3 mb-3 flex max-w-lg items-center justify-around rounded-2xl px-1 py-1"
        style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}
      >
        {mobileNavItems.map((item) => {
          const isActive = pathname?.startsWith(item.href) || (item.href === '/dashboard' && pathname === '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex min-w-[56px] flex-col items-center justify-center rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors duration-150',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {isActive && <span className="absolute inset-0 rounded-xl bg-primary/8" />}
              <Icon className="relative z-10 h-5 w-5" />
              <span className="relative z-10 mt-0.5">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
