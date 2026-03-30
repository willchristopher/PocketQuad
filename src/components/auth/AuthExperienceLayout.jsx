'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const authPanelFieldShellClassName =
  'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.14] focus-within:border-white/[0.22] focus-within:bg-white/[0.05] focus-within:ring-0';

export const authPanelInputClassName =
  'w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-white/30';

export const authPanelInfoMessageClassName = 'border-white/[0.08] bg-white/[0.04] text-white/60';
export const authPanelErrorMessageClassName = 'border-red-400/20 bg-red-500/[0.07] text-red-300';
export const authPanelSuccessMessageClassName = 'border-emerald-400/20 bg-emerald-500/[0.07] text-emerald-300';

export function AuthExperienceLayout({
  heroLead,
  heroDescription,
  children,
  className,
  heroClassName,
  panelClassName,
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={cn('dark relative min-h-screen overflow-hidden bg-[#002144] text-white', className)}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[#002144]" />
      </div>

      <div className="relative min-h-screen">
        <div className="grid min-h-screen lg:grid-cols-[1fr_28rem] xl:grid-cols-[1fr_32rem] 2xl:grid-cols-[1fr_34rem]">
          <section
            className={cn(
              'relative flex min-h-[28rem] flex-col justify-between px-6 pb-16 pt-8 sm:px-10 lg:min-h-screen lg:px-16 lg:pb-20 lg:pt-12 xl:px-24',
              heroClassName
            )}
          >
            <div className={prefersReducedMotion ? '' : 'animate-in-soft stagger-1'}>
              <Link
                href="/login"
                className="group inline-flex items-center gap-3.5 transition-opacity hover:opacity-80"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                  <Image
                    src="/transparentlogo.png"
                    alt="PocketQuad"
                    width={28}
                    height={28}
                    priority
                    className="object-contain brightness-0 invert opacity-50"
                  />
                </div>
                <span className="text-[13px] font-medium tracking-wide text-white/40">
                  PocketQuad
                </span>
              </Link>
            </div>

            <div className="relative max-w-[32rem] lg:my-auto">
              <div
                className={cn(
                  'mb-16 h-px w-12 bg-[#ECAC00]',
                  prefersReducedMotion ? '' : 'animate-in-up stagger-2'
                )}
              />

              <h1
                className={cn(
                  'font-display text-[clamp(2.8rem,7vw,5.2rem)] leading-[0.92] tracking-[-0.04em] text-white',
                  prefersReducedMotion ? '' : 'animate-in-soft stagger-3'
                )}
              >
                Your campus,
                <br />
                one sign-in away.
              </h1>

              {heroLead ? (
                <p
                  className={cn(
                    'mt-8 max-w-[28ch] font-display text-[clamp(1.1rem,1.8vw,1.4rem)] font-normal leading-[1.3] tracking-[-0.01em] text-white/50',
                    prefersReducedMotion ? '' : 'animate-in-up stagger-4'
                  )}
                >
                  {heroLead}
                </p>
              ) : null}

              {heroDescription ? (
                <p
                  className={cn(
                    'mt-6 max-w-[38ch] text-[15px] leading-[1.7] text-white/30',
                    prefersReducedMotion ? '' : 'animate-in-up stagger-5'
                  )}
                >
                  {heroDescription}
                </p>
              ) : null}
            </div>

            <div className={cn('hidden lg:block', prefersReducedMotion ? '' : 'animate-in-up stagger-6')}>
              <p className="text-[11px] tracking-[0.2em] text-white/20 uppercase">
                Murray State University
              </p>
            </div>
          </section>

          <section
            className={cn(
              'relative flex items-center border-l border-white/[0.06] px-6 pb-8 pt-4 sm:px-8 lg:px-10 lg:py-16 xl:px-14',
              prefersReducedMotion ? '' : 'animate-in-soft stagger-3'
            )}
          >
            <div className={cn('w-full', panelClassName)}>
              {children}
            </div>
          </section>
        </div>
      </div>
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
}) {
  return (
    <section className={cn('relative', className)}>
      <div className="relative">
        {headerSlot ? <div className="mb-8">{headerSlot}</div> : null}

        <div className="space-y-4">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ECAC00]">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-3">
            <h2 className="font-display text-[2rem] leading-[0.96] tracking-[-0.03em] text-white sm:text-[2.4rem]">
              {title}
            </h2>
            {description ? (
              <p className="max-w-[32ch] text-[14px] leading-[1.6] text-white/40">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-10">{children}</div>

        {footer ? (
          <div className="mt-10 border-t border-white/[0.06] pt-6 text-[14px] text-white/35">
            {footer}
          </div>
        ) : null}
      </div>
    </section>
  );
}
