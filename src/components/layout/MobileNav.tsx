'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarRange, LayoutGrid, LogOut, MessageCircleMore, UserCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'
import { useScrollDirection } from '@/hooks/useScrollDirection'

const mobileNavItems = [
  { icon: LayoutGrid, label: 'Home', href: '/dashboard' },
  { icon: CalendarRange, label: 'Calendar', href: '/calendar' },
  { icon: MessageCircleMore, label: 'Chat', href: '/chatroom' },
  { icon: UserCircle2, label: 'Profile', href: '/profile' },
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const minimized = useScrollDirection()

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 md:hidden">
      <div
        className={cn(
          'bg-gradient-to-t from-background to-transparent pointer-events-none transition-all duration-300',
          minimized ? 'h-1' : 'h-4',
        )}
      />
      <nav
        className={cn(
          'glass-card mx-auto flex max-w-lg items-center justify-evenly rounded-2xl transition-all duration-300',
          minimized ? 'mb-2 px-2 py-0.5' : 'mb-3 px-2 py-1',
        )}
        style={{
          paddingBottom: minimized
            ? 'max(2px, env(safe-area-inset-bottom))'
            : 'max(4px, env(safe-area-inset-bottom))',
        }}
      >
        {mobileNavItems.map((item) => {
          const isActive = pathname?.startsWith(item.href) || (item.href === '/dashboard' && pathname === '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-xl font-medium transition-all duration-300',
                minimized ? 'min-w-[40px] px-1.5 py-1' : 'min-w-[52px] px-2 py-1.5',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {isActive && <span className="absolute inset-0 rounded-xl bg-primary/8" />}
              <Icon
                className={cn(
                  'relative z-10 transition-all duration-300',
                  minimized ? 'h-4 w-4' : 'h-5 w-5',
                )}
              />
              <span
                className={cn(
                  'relative z-10 text-[10px] transition-all duration-300 overflow-hidden leading-tight',
                  minimized ? 'max-h-0 opacity-0 mt-0' : 'max-h-4 opacity-100 mt-0.5',
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
        <button
          onClick={() => { void handleLogout() }}
          className={cn(
            'relative flex flex-col items-center justify-center rounded-xl font-medium text-muted-foreground transition-all duration-300 hover:text-red-500',
            minimized ? 'min-w-[40px] px-1.5 py-1' : 'min-w-[52px] px-2 py-1.5',
          )}
        >
          <LogOut
            className={cn(
              'relative z-10 transition-all duration-300',
              minimized ? 'h-4 w-4' : 'h-5 w-5',
            )}
          />
          <span
            className={cn(
              'relative z-10 text-[10px] transition-all duration-300 overflow-hidden leading-tight',
              minimized ? 'max-h-0 opacity-0 mt-0' : 'max-h-4 opacity-100 mt-0.5',
            )}
          >
            Log Out
          </span>
        </button>
      </nav>
    </div>
  )
}
