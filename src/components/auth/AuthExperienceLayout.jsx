'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const authPanelFieldShellClassName =
  'border-border/70 bg-background/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] hover:border-primary/25 focus-within:border-primary/45 focus-within:bg-background focus-within:shadow-[0_0_0_4px_rgba(244,200,79,0.08)] focus-within:ring-0';

export const authPanelInputClassName =
  'w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/70';

export const authPanelInfoMessageClassName = 'border-border/70 bg-muted/40 text-muted-foreground';
export const authPanelErrorMessageClassName = 'border-red-500/30 bg-red-500/10 text-red-300';
export const authPanelSuccessMessageClassName = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

export function AuthExperienceLayout({
  heroLead,
  heroDescription,
  heroKicker = 'Campus access for students and faculty',
  children,
  className,
  heroClassName,
  panelClassName,
}) {
  const prefersReducedMotion = useReducedMotion();
  const watermarkMotion = prefersReducedMotion
    ? {}
    : {
        animate: {
          y: [0, -14, 0],
          rotate: [0, -1.5, 0],
          scale: [1, 1.02, 1],
        },
        transition: {
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      };
  const orbMotion = prefersReducedMotion
    ? {}
    : {
        animate: { x: [0, 18, 0], y: [0, -12, 0] },
        transition: { duration: 18, repeat: Infinity, ease: 'easeInOut' },
      };

  return (
    <div className={cn('dark relative min-h-screen overflow-hidden bg-background text-foreground', className)}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,200,79,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(17,27,87,0.24),transparent_24%),linear-gradient(180deg,#0f173e_0%,#0b122e_100%)]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:74px_74px]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle,_rgba(255,255,255,0.4)_1px,_transparent_1px)] [background-size:18px_18px]" />
        <motion.div
          className="absolute left-[-9rem] top-[8rem] h-[16rem] w-[16rem] rounded-full bg-primary/12 blur-3xl"
          {...orbMotion}
        />
        <motion.div
          className="absolute right-[-6rem] top-[16%] h-[22rem] w-[22rem] rounded-full bg-secondary/16 blur-3xl"
          {...orbMotion}
        />
        <div className="absolute inset-y-0 right-0 hidden w-[46vw] border-l border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.015)_0%,rgba(255,255,255,0.04)_100%)] lg:block" />

        <motion.div
          className="absolute right-[-8rem] top-[10rem] hidden aspect-square w-[38rem] opacity-[0.16] lg:block xl:w-[44rem]"
          {...watermarkMotion}
        >
          <Image
            src="/transparentlogo.png"
            alt=""
            fill
            priority
            aria-hidden="true"
            className="object-contain [filter:grayscale(1)_sepia(0.3)_hue-rotate(-15deg)_saturate(0.55)_brightness(0.52)]"
          />
        </motion.div>

        <svg
          viewBox="0 0 1600 900"
          aria-hidden="true"
          className="absolute inset-0 hidden h-full w-full lg:block"
        >
          <path
            d="M238 628C348 571 458 548 612 568C742 584 846 646 952 630C1042 618 1092 564 1180 536"
            fill="none"
            stroke="rgba(196,106,67,0.34)"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeDasharray="10 16"
          />
          <path
            d="M580 648C680 598 782 584 870 596C958 608 1038 662 1094 724"
            fill="none"
            stroke="rgba(64,79,71,0.22)"
            strokeWidth="2.75"
            strokeLinecap="round"
          />
          <circle cx="601" cy="567" r="8" fill="rgba(196,106,67,0.82)" />
          <circle cx="987" cy="617" r="7" fill="rgba(64,79,71,0.48)" />
        </svg>
      </div>

      <div className="relative min-h-screen">
        <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_32rem] xl:grid-cols-[minmax(0,1fr)_34rem]">
          <section
            className={cn(
              'relative flex min-h-[25rem] flex-col px-5 pb-12 pt-6 sm:px-8 sm:pt-8 lg:min-h-screen lg:px-14 lg:pb-14 lg:pt-10 xl:px-16',
              heroClassName
            )}
          >
            <div className={prefersReducedMotion ? '' : 'animate-in-soft stagger-1'}>
              <Link
                href="/login"
                className="inline-flex items-center gap-4 text-foreground transition-opacity hover:opacity-88"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.45rem] border border-white/10 bg-card/70 shadow-[0_14px_36px_rgba(2,6,23,0.28)] backdrop-blur-sm">
                  <Image
                    src="/transparentlogo.png"
                    alt="PocketQuad logo"
                    width={36}
                    height={36}
                    priority
                    className="object-contain [filter:grayscale(1)_sepia(0.22)_hue-rotate(-15deg)_saturate(0.72)_brightness(0.42)]"
                  />
                </div>
                <div>
                  <p className="poster-label !text-muted-foreground">
                    Campus hub
                  </p>
                </div>
              </Link>
            </div>

            <div className="relative mt-16 max-w-[34rem] lg:my-auto">
              <div className={prefersReducedMotion ? 'mb-8' : 'mb-8 animate-in-soft stagger-2'}>
                <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/10 bg-card/70 shadow-[0_20px_48px_rgba(2,6,23,0.3)] backdrop-blur-sm sm:h-28 sm:w-28">
                  <Image
                    src="/transparentlogo.png"
                    alt="PocketQuad emblem"
                    width={72}
                    height={72}
                    priority
                    className="object-contain [filter:grayscale(1)_sepia(0.22)_hue-rotate(-15deg)_saturate(0.78)_brightness(0.4)] sm:h-[5.25rem] sm:w-[5.25rem]"
                  />
                </div>
              </div>

              <p
                className={cn(
                  'poster-label !text-primary/80',
                  prefersReducedMotion ? '' : 'animate-in-up stagger-3'
                )}
              >
                {heroKicker}
              </p>

              <h1
                className={cn(
                  'mt-5 font-display text-[clamp(4rem,10vw,6.6rem)] leading-[0.9] tracking-[-0.08em] text-foreground',
                  prefersReducedMotion ? '' : 'animate-in-soft stagger-4'
                )}
              >
                PocketQuad
              </h1>

              <p
                className={cn(
                  'mt-5 max-w-[18ch] font-display text-[clamp(1.18rem,2.05vw,1.65rem)] font-medium leading-[1.06] tracking-[-0.04em] text-foreground/90',
                  prefersReducedMotion ? '' : 'animate-in-up stagger-5'
                )}
              >
                {heroLead}
              </p>

              <p
                className={cn(
                  'mt-6 max-w-[30rem] text-base leading-7 text-muted-foreground',
                  prefersReducedMotion ? '' : 'animate-in-up stagger-6'
                )}
              >
                {heroDescription}
              </p>
            </div>
          </section>

          <section className="relative flex items-end px-4 pb-4 sm:px-6 sm:pb-6 lg:items-center lg:px-10 lg:py-10 xl:px-14">
            <div
              className={cn(
                'w-full lg:ml-auto',
                prefersReducedMotion ? '' : 'animate-in-soft stagger-4',
                panelClassName
              )}
            >
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
    <section
      className={cn(
        'relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,27,87,0.32)_0%,rgba(14,22,63,0.82)_100%)] p-6 shadow-[0_28px_60px_rgba(2,6,23,0.32)] backdrop-blur-xl sm:p-8 [&_label]:!text-muted-foreground',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/85 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_top_right,rgba(244,200,79,0.09),transparent_70%)]" />

      <div className="relative">
        {headerSlot ? <div className="mb-6">{headerSlot}</div> : null}

        <div className="space-y-3">
          {eyebrow ? (
            <p className="poster-label !text-primary/80">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-2">
            <h2 className="font-display text-[2.15rem] leading-[0.96] tracking-[-0.05em] text-foreground sm:text-[2.65rem]">
              {title}
            </h2>
            {description ? (
              <p className="max-w-[30rem] text-sm leading-6 text-muted-foreground sm:text-[15px]">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-8">{children}</div>

        {footer ? <div className="mt-8 border-t border-white/10 pt-5 text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </section>
  );
}
