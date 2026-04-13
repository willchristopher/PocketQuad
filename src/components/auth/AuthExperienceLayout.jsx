'use client';

import { useReducedMotion } from 'framer-motion';
import { AppBrand } from '@/components/auth/AuthShell';
import { cn } from '@/lib/utils';

export const authPanelFieldShellClassName =
  'border-border/80 bg-background/[0.88] hover:border-primary/[0.18] focus-within:border-primary/[0.28] focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/10';

export const authPanelInputClassName =
  'w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/70';

export const authPanelInfoMessageClassName = 'border-primary/10 bg-primary/[0.05] text-foreground';
export const authPanelErrorMessageClassName = 'border-red-200 bg-red-50 text-red-700';
export const authPanelSuccessMessageClassName =
  'border-emerald-200 bg-emerald-50 text-emerald-700';

export function AuthExperienceLayout({
  heroLead,
  heroDescription,
  children,
  className,
  panelClassName,
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={cn('relative min-h-screen overflow-hidden bg-background text-foreground', className)}>
      <div className="pointer-events-none absolute inset-0 bg-background" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className={cn('w-full', panelClassName ?? 'max-w-[34rem]')}>
          <div
            className={cn(
              'mx-auto flex max-w-[32rem] flex-col items-center text-center',
              prefersReducedMotion ? '' : 'animate-in-soft'
            )}
          >
            <AppBrand align="center" />
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Murray State University
            </p>

            {heroLead ? (
              <p className="mt-4 max-w-[30rem] text-sm leading-6 text-foreground sm:text-[15px]">
                {heroLead}
              </p>
            ) : null}

            {heroDescription ? (
              <p className="mt-2 max-w-[34rem] text-sm leading-6 text-muted-foreground sm:text-[15px]">
                {heroDescription}
              </p>
            ) : null}
          </div>

          <div className={cn('mx-auto mt-8 w-full max-w-[34rem]', prefersReducedMotion ? '' : 'animate-in-up')}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export function AuthInteractionPanel({
  eyebrow,
  title,
  description,
  headerSlot,
  footer,
  children,
  className,
  mobileCentered = false,
}) {
  return (
    <section
      className={cn(
        'surface-card-lg relative overflow-hidden rounded-[28px] border border-border/70 bg-card/95 p-6 shadow-[0_24px_60px_rgba(0,33,68,0.08)] sm:p-8 lg:p-10',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-border/70" />

      <div className="relative">
        {headerSlot ? <div className="mb-6">{headerSlot}</div> : null}

        <div
          className={cn(
            mobileCentered ? 'space-y-3 text-center' : 'space-y-3',
            'font-body'
          )}
        >
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-2">
            <h1 className="font-display text-[2rem] leading-[1.02] tracking-tight text-foreground sm:text-[2.35rem]">
              {title}
            </h1>
            {description ? (
              <p
                className={cn(
                  'max-w-[34rem] text-sm leading-6 text-muted-foreground sm:text-[15px]',
                  mobileCentered ? 'mx-auto' : ''
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-8">{children}</div>

        {footer ? (
          <div
            className={cn(
              'mt-8 border-t border-border/70 pt-6 text-sm text-muted-foreground',
              mobileCentered ? 'text-center' : ''
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </section>
  );
}
