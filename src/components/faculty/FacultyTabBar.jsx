'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, CalendarDays, Clock3, Megaphone, Settings } from 'lucide-react';
import { useFacultyPages } from './FacultyPagesContext';
import { cn } from '@/lib/utils';

const TAB_CONFIG = [
  { id: 'office-hours', label: 'Hours', href: '/faculty/office-hours', icon: Clock3 },
  { id: 'events', label: 'Events', href: '/faculty/events', icon: CalendarDays },
  { id: 'announcements', label: 'Announce', href: '/faculty/announcements', icon: Megaphone },
  { id: 'buildings', label: 'Buildings', href: '/faculty/buildings', icon: Building2 },
];

const SETTINGS_TAB = {
  id: 'settings',
  label: 'Settings',
  href: '/faculty/settings',
  icon: Settings,
};

export function FacultyTabBar() {
  const pathname = usePathname();
  const { visiblePages, hydrated } = useFacultyPages();

  const tabs = React.useMemo(
    () => [
      ...TAB_CONFIG.filter((tab) => !hydrated || visiblePages.includes(tab.id)),
      SETTINGS_TAB,
    ],
    [visiblePages, hydrated],
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 backdrop-blur-md"
      aria-label="Faculty navigation"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-1">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'flex min-h-[56px] min-w-[48px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-semibold tracking-wide transition-colors',
                isActive
                  ? 'text-[var(--msu-gold)]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className="h-[22px] w-[22px]"
                strokeWidth={isActive ? 2.25 : 1.75}
              />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
