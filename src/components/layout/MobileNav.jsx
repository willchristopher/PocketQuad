'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { isStudentPathActive, studentMobileNavigationItems } from '@/components/layout/studentNavigation';

export function MobileNav() {
  const pathname = usePathname();
  const minimized = useScrollDirection();

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 lg:hidden">
      <div className={cn('pointer-events-none transition-all duration-300', minimized ? 'h-2' : 'h-6')} />
      <nav
        className={cn(
          'glass-card mx-auto flex max-w-xl items-center justify-between rounded-[1.7rem] border border-border/70 px-2 transition-all duration-300',
          minimized ? 'py-1.5' : 'py-2.5',
        )}
        style={{
          paddingBottom: minimized
            ? 'max(0.375rem, env(safe-area-inset-bottom))'
            : 'max(0.625rem, env(safe-area-inset-bottom))',
        }}
      >
        {studentMobileNavigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = isStudentPathActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex min-w-[64px] flex-1 flex-col items-center justify-center rounded-[1.2rem] px-2 py-2 text-center transition-all duration-300',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {isActive ? <span className="absolute inset-0 rounded-[1.2rem] bg-primary/10" /> : null}
              <Icon className={cn('relative z-10 transition-all duration-300', minimized ? 'h-[18px] w-[18px]' : 'h-5 w-5')} />
              <span
                className={cn(
                  'relative z-10 mt-1 overflow-hidden text-[10px] font-semibold uppercase tracking-[0.14em] transition-all duration-300',
                  minimized ? 'max-h-0 opacity-0' : 'max-h-4 opacity-100',
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
