'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarRange,
  CalendarClock,
  ExternalLink,
  LayoutGrid,
  MapPinned,
  MessageCircleMore,
  UserCircle2,
  Users2,
  BellRing,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

const navigationItems = [
  { icon: LayoutGrid, label: 'Dashboard', href: '/dashboard' },
  { icon: CalendarRange, label: 'Calendar', href: '/calendar' },
  { icon: CalendarClock, label: 'Events', href: '/events' },
  { icon: Users2, label: 'Faculty', href: '/faculty-directory' },
  { icon: MessageCircleMore, label: 'Chat', href: '/chatroom' },
  { icon: MapPinned, label: 'Map & Services', href: '/campus-map' },
  { icon: ExternalLink, label: 'Resources', href: '/links-directory' },
  { icon: BellRing, label: 'Notifications', href: '/notifications' },
  { icon: UserCircle2, label: 'Profile', href: '/profile' },
]

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((previous) => !previous)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const navigate = React.useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router]
  )

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages" />
      <CommandList>
        <CommandEmpty>No matching page found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <CommandItem key={item.href} onSelect={() => navigate(item.href)}>
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            )
          })}
        </CommandGroup>
        <CommandSeparator />
      </CommandList>
    </CommandDialog>
  )
}
