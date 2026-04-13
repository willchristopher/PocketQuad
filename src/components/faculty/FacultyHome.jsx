'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Clock3,
  LogOut,
  Megaphone,
  School,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useFacultyPages } from './FacultyPagesContext';
import { cn } from '@/lib/utils';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const ACTIONS = [
  {
    id: 'office-hours',
    title: 'Change office hours',
    description: 'Update your weekly schedule and availability status.',
    href: '/faculty/office-hours',
    icon: Clock3,
  },
  {
    id: 'events',
    title: 'Create or change an event',
    description: 'Publish workshops, sessions, and student-facing events.',
    href: '/faculty/events',
    icon: CalendarDays,
  },
  {
    id: 'announcements',
    title: 'Publish an announcement',
    description: 'Send campus, building, or service updates to students.',
    href: '/faculty/announcements',
    icon: Megaphone,
  },
  {
    id: 'buildings',
    title: 'Change building status',
    description: 'Update hours, operational status, and accessibility notes.',
    href: '/faculty/buildings',
    icon: Building2,
  },
];

export function FacultyHome() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const { visiblePages } = useFacultyPages();
  const [greeting, setGreeting] = React.useState('Good morning');

  React.useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const firstName =
    profile?.firstName ||
    profile?.displayName?.split(' ')[0] ||
    'there';

  const visibleActions = ACTIONS.filter((a) => visiblePages.includes(a.id));

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="space-y-10 animate-in-soft">
      <header className="space-y-3 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <School className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
              PocketQuad
            </span>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
        <h1 className="font-display text-[2rem] font-extrabold tracking-tight sm:text-[2.5rem]">
          {greeting}, {firstName}.
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          What would you like to do today?
        </p>
      </header>

      <nav aria-label="Quick actions">
        <ul className="space-y-2">
          {visibleActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <li
                key={action.id}
                className={cn('animate-in-up', `stagger-${index + 1}`)}
              >
                <Link
                  href={action.href}
                  className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card px-5 py-4 transition-all hover:border-border hover:shadow-sm"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors group-hover:border-primary/25 group-hover:text-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {action.title}
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
