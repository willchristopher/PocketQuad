'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, LayoutGrid, LogOut, PanelLeftClose, PanelLeftOpen, School } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth/context';
import { useSidebarCollapsed } from '@/components/layout/SidebarContext';
import { useUniversityTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const navigationItems = [
  { icon: LayoutGrid, label: 'Dashboard', href: '/faculty/dashboard' },
  { icon: Building2, label: 'Buildings', href: '/faculty/profile' },
];

function FacultySidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { universityName } = useUniversityTheme();
  const { sidebarCollapsed, toggleSidebar } = useSidebarCollapsed();

  const displayName = profile?.displayName ?? 'Faculty Member';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className={cn('sidebar-shell flex h-full w-full flex-col rounded-none p-4 transition-[padding] duration-200 lg:rounded-2xl', sidebarCollapsed && 'items-center px-3')}>
      <div className={cn('flex items-start gap-3', sidebarCollapsed ? 'w-full flex-col items-center' : 'justify-between')}>
        <Link
          href="/faculty/dashboard"
          className={cn('rounded-xl border border-border/60 bg-card px-4 py-4 transition-colors hover:bg-muted/40', sidebarCollapsed && 'flex h-14 w-14 items-center justify-center p-0')}
          title="PocketQuad faculty tools"
        >
          <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-background text-foreground">
              <School className="h-5 w-5" />
            </div>
            {!sidebarCollapsed ? (
              <div className="min-w-0">
                <p className="font-display text-3xl leading-none text-foreground">PocketQuad</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Faculty tools</p>
              </div>
            ) : null}
          </div>
          {!sidebarCollapsed ? (
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">{universityName ?? 'Campus tools'}</p>
          ) : null}
        </Link>

        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground lg:inline-flex"
          aria-label={sidebarCollapsed ? 'Expand faculty navigation' : 'Collapse faculty navigation'}
          title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
        </button>
      </div>

      <div className={cn('mt-6 flex-1 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar', sidebarCollapsed && 'w-full pr-0')}>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('sidebar-link', isActive && 'sidebar-link-active')}
              aria-current={isActive ? 'page' : undefined}
              title={item.label}
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-background',
                  isActive && 'border-primary/20 bg-card',
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
              </span>
              {!sidebarCollapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </div>

      <div className={cn('mt-4 rounded-xl border border-border/60 bg-card p-4', sidebarCollapsed && 'w-full p-3')}>
        <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
          <Avatar className="h-11 w-11 rounded-lg border border-border/60">
            <AvatarImage src={profile?.avatar ?? undefined} alt={displayName} />
            <AvatarFallback className="rounded-lg bg-background text-sm text-foreground">
              {initials || 'FM'}
            </AvatarFallback>
          </Avatar>
          {!sidebarCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{profile?.email ?? 'faculty@pocketquad.edu'}</p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          className={cn('sidebar-link sidebar-link-secondary mt-4 w-full py-2.5 text-left hover:bg-red-500/10 hover:text-red-200', sidebarCollapsed && 'justify-center px-0')}
          title="Log out"
        >
          <LogOut className="h-[18px] w-[18px]" />
          {!sidebarCollapsed ? <span>Log out</span> : null}
        </button>
      </div>
    </div>
  );
}

export function FacultySidebar({ mobile = false }) {
  const { sidebarCollapsed } = useSidebarCollapsed();

  if (mobile) {
    return <FacultySidebarContent />;
  }

  return (
    <aside className={cn('fixed inset-y-4 left-4 z-40 hidden transition-[width] duration-200 lg:flex', sidebarCollapsed ? 'w-[112px]' : 'w-[288px]')}>
      <FacultySidebarContent />
    </aside>
  );
}
