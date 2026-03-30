'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

import { useAuth } from '@/lib/auth/context';
import { useStudentPageVisibility } from '@/hooks/useStudentPageVisibility';
import { cn } from '@/lib/utils';
import {
  getStudentNavigationSections,
  getStudentSecondaryNavigationItems,
  isStudentPathActive,
} from '@/components/layout/studentNavigation';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const { disabledStudentPages } = useStudentPageVisibility();
  const [hovered, setHovered] = React.useState(false);
  const [focusWithin, setFocusWithin] = React.useState(false);
  const studentNavigationSections = React.useMemo(
    () => getStudentNavigationSections(disabledStudentPages),
    [disabledStudentPages],
  );
  const studentSecondaryNavigationItems = React.useMemo(
    () => getStudentSecondaryNavigationItems(disabledStudentPages),
    [disabledStudentPages],
  );

  const navItems = [
    ...studentNavigationSections.flatMap((section) => section.items),
    ...studentSecondaryNavigationItems,
  ];
  const dockItems = [...navItems, { icon: LogOut, label: 'Log out', action: 'logout' }];
  const activeIndex = Math.max(navItems.findIndex((item) => isStudentPathActive(pathname, item.href)), 0);
  const expanded = hovered || focusWithin;

  const itemSize = 44;
  const itemGap = 8;
  const dockPadding = 10;
  const trackWidth = dockItems.length * itemSize + (dockItems.length - 1) * itemGap;
  const collapsedWidth = itemSize + dockPadding * 2;
  const expandedWidth = trackWidth + dockPadding * 2;
  const glowWidth = expandedWidth + 96;
  const collapsedOffset = activeIndex * (itemSize + itemGap);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleBlurCapture = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFocusWithin(false);
    }
  };

  return (
    <div
      className="pointer-events-none fixed bottom-0 left-1/2 z-40 hidden -translate-x-1/2 lg:block"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-20 -translate-x-1/2 rounded-full bg-gradient-to-t from-background via-background/86 to-transparent blur-xl transition-[width,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          width: `${expanded ? glowWidth : collapsedWidth + 72}px`,
          opacity: expanded ? 1 : 0.78,
        }}
      />

      <nav
        aria-label="Primary"
        className="pointer-events-auto glass-card relative overflow-hidden rounded-full border border-border/70 shadow-[0_20px_48px_rgba(15,23,42,0.16)] transition-[width,transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          width: `${expanded ? expandedWidth : collapsedWidth}px`,
          transform: expanded ? 'translateY(-2px)' : 'translateY(0)',
          padding: `${dockPadding}px`,
          boxShadow: expanded
            ? '0 24px 56px rgba(15, 23, 42, 0.2)'
            : '0 18px 40px rgba(15, 23, 42, 0.14)',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocusWithin(true)}
        onBlurCapture={handleBlurCapture}
      >
        <div className="overflow-hidden">
          <div
            className="flex items-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
            style={{
              gap: `${itemGap}px`,
              width: `${trackWidth}px`,
              transform: `translate3d(${expanded ? 0 : -collapsedOffset}px, 0, 0)`,
            }}
          >
            {dockItems.map((item) => {
              const Icon = item.icon;
              const isLogout = item.action === 'logout';
              const isActive = !isLogout && isStudentPathActive(pathname, item.href);
              const sharedClassName = cn(
                'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-[color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive
                  ? 'bg-primary/12 text-primary shadow-[inset_0_0_0_1px_rgba(var(--brand-primary-rgb),0.12)]'
                  : isLogout
                    ? 'text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              );

              if (isLogout) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      void handleSignOut();
                    }}
                    className={sharedClassName}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={sharedClassName}
                  aria-current={isActive ? 'page' : undefined}
                  title={item.label}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
