'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { School } from 'lucide-react';
import { FacultyPagesProvider } from '@/components/faculty/FacultyPagesContext';
import { FacultyTabBar } from '@/components/faculty/FacultyTabBar';
import { getNextThemeMode, getThemeModeLabel, renderThemeModeIcon } from '@/components/layout/layoutUtils';
import { useUniversityTheme } from '@/lib/theme';

function FacultyTopBar() {
  const pathname = usePathname();
  const { themeMode, setThemeMode } = useUniversityTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (pathname === '/faculty') {
    return null;
  }

  const themeLabel = getThemeModeLabel({ mounted, themeMode });

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/faculty"
          className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <School className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">
            PocketQuad
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setThemeMode(getNextThemeMode(themeMode))}
          className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`Theme: ${themeLabel}`}
          title={themeLabel}
        >
          {renderThemeModeIcon({ mounted, themeMode, className: 'h-4 w-4' })}
        </button>
      </div>
    </header>
  );
}

export function FacultyLayoutShell({ children }) {
  return (
    <FacultyPagesProvider>
      <div className="dark min-h-screen bg-background text-foreground">
        <FacultyTopBar />
        <main
          id="main-content"
          tabIndex="-1"
          className="min-h-screen overflow-y-auto px-4 pb-24 sm:px-6 custom-scrollbar"
        >
          <div className="mx-auto max-w-3xl">{children}</div>
        </main>
        <FacultyTabBar />
      </div>
    </FacultyPagesProvider>
  );
}
