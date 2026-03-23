'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BellRing, CalendarClock, ExternalLink, Flag, LayoutGrid, LogOut, MapPinned, MessageCircleMore, UserCircle2, Users2, } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/context';

const sections = [
    {
        title: null,
        items: [
            { icon: LayoutGrid, label: 'Dashboard', href: '/dashboard' },
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
        ],
    },
];

const bottomItems = [
    { icon: BellRing, label: 'Notifications', href: '/notifications' },
    { icon: UserCircle2, label: 'Profile', href: '/profile' },
];

const ITEM_SIZE = 44;
const ITEM_GAP = 8;
const DOCK_PADDING = 10;

function isActivePath(pathname, href) {
    return pathname === href ||
        pathname?.startsWith(href + '/') ||
        (href === '/dashboard' && pathname === '/') ||
        (href === '/campus-map' && pathname === '/services-status');
}

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { signOut } = useAuth();
    const [hovered, setHovered] = React.useState(false);
    const [focusWithin, setFocusWithin] = React.useState(false);

    const navItems = [...sections.flatMap((section) => section.items), ...bottomItems];
    const dockItems = [...navItems, { icon: LogOut, label: 'Log out', action: 'logout' }];
    const activeIndex = Math.max(navItems.findIndex((item) => isActivePath(pathname, item.href)), 0);
    const expanded = hovered || focusWithin;
    const trackWidth = dockItems.length * ITEM_SIZE + (dockItems.length - 1) * ITEM_GAP;
    const collapsedWidth = ITEM_SIZE + DOCK_PADDING * 2;
    const expandedWidth = trackWidth + DOCK_PADDING * 2;
    const glowWidth = expandedWidth + 96;
    const collapsedOffset = activeIndex * (ITEM_SIZE + ITEM_GAP);

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
    };

    const handleBlurCapture = (event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setFocusWithin(false);
        }
    };

    return (<div className="pointer-events-none fixed bottom-0 left-1/2 z-40 hidden -translate-x-1/2 md:block" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-20 -translate-x-1/2 rounded-full bg-gradient-to-t from-background via-background/86 to-transparent blur-xl transition-[width,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{
            width: `${expanded ? glowWidth : collapsedWidth + 72}px`,
            opacity: expanded ? 1 : 0.78,
        }}/>

      <nav aria-label="Primary" className="pointer-events-auto glass-card relative overflow-hidden rounded-full border border-white/12 shadow-[0_20px_48px_rgba(15,23,42,0.16)] transition-[width,transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-white/10" style={{
            width: `${expanded ? expandedWidth : collapsedWidth}px`,
            transform: expanded ? 'translateY(-2px)' : 'translateY(0)',
            padding: `${DOCK_PADDING}px`,
            boxShadow: expanded
                ? '0 24px 56px rgba(15, 23, 42, 0.2)'
                : '0 18px 40px rgba(15, 23, 42, 0.14)',
        }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocusWithin(true)} onBlurCapture={handleBlurCapture}>
        <div className="overflow-hidden">
          <div className="flex items-center will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{
                gap: `${ITEM_GAP}px`,
                width: `${trackWidth}px`,
                transform: `translate3d(${expanded ? 0 : -collapsedOffset}px, 0, 0)`,
            }}>
            {dockItems.map((item) => {
                const isLogout = item.action === 'logout';
                const isActive = !isLogout && isActivePath(pathname, item.href);
                const sharedClassName = cn('relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-[color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background', isActive
                    ? 'bg-primary/12 text-primary shadow-[inset_0_0_0_1px_rgba(59,130,246,0.16)]'
                    : isLogout
                        ? 'text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400'
                        : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground');
                const Icon = item.icon;
                if (isLogout) {
                    return (<button key={item.label} onClick={() => { void handleLogout(); }} className={sharedClassName} aria-label={item.label} title={item.label} type="button">
                    <Icon className="h-[18px] w-[18px]"/>
                  </button>);
                }
                return (<Link key={item.href} href={item.href} className={sharedClassName} aria-current={isActive ? 'page' : undefined} title={item.label}>
                  <Icon className="h-[18px] w-[18px]"/>
                </Link>);
            })}
          </div>
        </div>
      </nav>
    </div>);
}
