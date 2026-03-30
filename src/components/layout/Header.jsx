'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bell, LogOut, Menu } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { NotificationBadge } from '@/components/notifications/NotificationBadge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  getCurrentDateLabel,
  getNextThemeMode,
  getThemeModeLabel,
  renderThemeModeIcon,
} from '@/components/layout/layoutUtils';
import {
  getStudentNavigationSections,
  getStudentSecondaryNavigationItems,
  getStudentPageMeta,
  isStudentPathActive,
} from '@/components/layout/studentNavigation';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useStudentPageVisibility } from '@/hooks/useStudentPageVisibility';
import { useAuth } from '@/lib/auth/context';
import { useUniversityTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const { disabledStudentPages, isPageVisible } = useStudentPageVisibility();
  const { themeMode, setThemeMode, universityColors, universityName } = useUniversityTheme();
  const { unreadCount } = useUnreadNotificationCount();
  const [mounted, setMounted] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const page = getStudentPageMeta(pathname);
  const studentNavigationSections = React.useMemo(
    () => getStudentNavigationSections(disabledStudentPages),
    [disabledStudentPages],
  );
  const studentSecondaryNavigationItems = React.useMemo(
    () => getStudentSecondaryNavigationItems(disabledStudentPages),
    [disabledStudentPages],
  );
  const dateLabel = React.useMemo(() => getCurrentDateLabel(), []);

  React.useEffect(() => setMounted(true), []);

  const handleSignOut = async () => {
    setSheetOpen(false);
    await signOut();
    router.push('/login');
  };

  const cycleTheme = () => {
    setThemeMode(getNextThemeMode(themeMode, universityColors));
  };

  const themeLabel = getThemeModeLabel({ mounted, themeMode, universityName });
  const showDashboardBrand = pathname === '/' || pathname === '/dashboard';

  return (
    <header className="shell-header sticky top-0 z-30 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1500px] items-start gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card/70 text-muted-foreground transition-all hover:border-primary/25 hover:bg-card hover:text-foreground lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] border-r border-border/70 bg-background p-0">
              <div className="flex h-full flex-col">
                <div className="border-b border-border/70 px-5 py-5">
                  <p className="poster-label">{universityName ?? 'Campus workspace'}</p>
                  <p className="mt-2 font-display text-3xl text-foreground">PocketQuad</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Student tools, faculty access, events, and campus information in one place.
                  </p>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-4">
                  {studentNavigationSections.map((section) => (
                    <div key={section.title} className="mb-6">
                      <p className="px-2 text-[11px] font-medium uppercase tracking-[0.26em] text-muted-foreground">
                        {section.title}
                      </p>
                      <div className="mt-3 space-y-1.5">
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = isStudentPathActive(pathname, item.href);

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setSheetOpen(false)}
                              className={cn(
                                'flex items-center gap-3 rounded-[1.15rem] border px-4 py-3 text-sm font-medium transition-all',
                                isActive
                                  ? 'border-primary/25 bg-secondary text-foreground shadow-surface'
                                  : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted hover:text-foreground',
                              )}
                            >
                              <Icon className="h-[18px] w-[18px] shrink-0" />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>

                <div className="border-t border-border/70 px-4 py-4">
                  <div className="space-y-1.5">
                    {studentSecondaryNavigationItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = isStudentPathActive(pathname, item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSheetOpen(false)}
                          className={cn(
                            'flex items-center gap-3 rounded-[1.15rem] border px-4 py-3 text-sm font-medium transition-all',
                            isActive
                              ? 'border-primary/25 bg-secondary text-foreground shadow-surface'
                              : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted hover:text-foreground',
                          )}
                        >
                          <Icon className="h-[18px] w-[18px] shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="flex w-full items-center gap-3 rounded-[1.15rem] border border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:border-border/70 hover:bg-muted hover:text-foreground"
                    >
                      <LogOut className="h-[18px] w-[18px] shrink-0" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0">
            <p className="poster-label">{universityName ?? 'PocketQuad campus brief'}</p>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 md:gap-3">
              {showDashboardBrand ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-card/70 p-1.5 shadow-surface transition-all hover:border-primary/25 hover:bg-card"
                  aria-label="PocketQuad dashboard"
                >
                  <Image
                    src="/transparentlogo.png"
                    alt="PocketQuad logo"
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                    priority
                  />
                </Link>
              ) : null}
              <h1 className="truncate font-display text-[1.9rem] text-foreground sm:text-[2.15rem]">
                {page.title}
              </h1>
              <span className="hidden rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground md:inline-flex">
                {dateLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={cycleTheme}
            className="flex h-11 items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 text-sm font-medium text-muted-foreground transition-all hover:border-primary/25 hover:bg-card hover:text-foreground"
            aria-label={`Theme: ${themeLabel}`}
            title={themeLabel}
          >
            {renderThemeModeIcon({ mounted, themeMode, className: 'h-[18px] w-[18px]' })}
            <span className="hidden md:inline">{themeLabel}</span>
          </button>

          {isPageVisible('notifications') ? (
            <Link
              href="/notifications"
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/70 text-muted-foreground transition-all hover:border-primary/25 hover:bg-card hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              <div className="absolute -right-1.5 -top-1">
                <NotificationBadge count={unreadCount} />
              </div>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
