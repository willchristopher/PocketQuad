'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';

import {
  getNextThemeMode,
  getThemeModeLabel,
  renderThemeModeIcon,
} from '@/components/layout/layoutUtils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { FacultySidebar } from './FacultySidebar';
import { useUniversityTheme } from '@/lib/theme';

function getFacultyPageMeta(pathname) {
  if (pathname === '/faculty/profile') {
    return {
      title: 'Buildings',
    };
  }

  return {
    title: 'Dashboard',
  };
}

export function FacultyHeader() {
  const pathname = usePathname();
  const { themeMode, setThemeMode, universityName } = useUniversityTheme();
  const [mounted, setMounted] = React.useState(false);
  const page = getFacultyPageMeta(pathname);
  React.useEffect(() => setMounted(true), []);

  const cycleTheme = () => {
    setThemeMode(getNextThemeMode(themeMode));
  };

  const themeLabel = getThemeModeLabel({ mounted, themeMode });

  return (
    <header className="shell-header sticky top-0 z-30 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1500px] items-start gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card/70 text-muted-foreground transition-all hover:border-primary/25 hover:bg-card hover:text-foreground lg:hidden"
                aria-label="Open faculty navigation"
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] border-r border-border/70 bg-background p-0">
              <FacultySidebar mobile />
            </SheetContent>
          </Sheet>

          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{universityName ?? 'Murray State University'}</p>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 md:gap-3">
              <h1 className="truncate font-display text-[1.9rem] text-foreground sm:text-[2.15rem]">
                {page.title}
              </h1>
            </div>
          </div>
        </div>

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
      </div>
    </header>
  );
}
