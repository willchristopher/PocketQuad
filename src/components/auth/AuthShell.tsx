import type { HTMLAttributes, ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cva, type VariantProps } from 'class-variance-authority'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function AppBrand({
  href = '/login',
  align = 'center',
}: {
  href?: string
  align?: 'center' | 'left'
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-3 text-foreground transition-opacity hover:opacity-90',
        align === 'center' ? 'mx-auto' : '',
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/15 bg-card shadow-surface">
        <Image
          src="/transparentlogo.png"
          alt="PocketQuad logo"
          width={36}
          height={36}
          className="rounded-xl"
          priority
        />
      </div>
      <div>
        <p className="font-display text-3xl leading-none text-foreground">
          Pocket<span className="gradient-text">Quad</span>
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Campus Hub
        </p>
      </div>
    </Link>
  )
}

export function AuthShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-12rem] top-[-8rem] h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-10rem] right-[-10rem] h-[24rem] w-[24rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.72),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(77,124,255,0.08),transparent_28%)]" />
        <div className="absolute inset-0 opacity-[0.045] [background-image:radial-gradient(circle,_#0f172a_1px,_transparent_1px)] [background-size:28px_28px]" />
      </div>

      <main className={cn('relative mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10 sm:px-6', className)}>
        <div className="w-full">{children}</div>
      </main>
    </div>
  )
}

export function AuthCard({
  badge,
  title,
  description,
  children,
  footer,
  className,
}: {
  badge?: string
  title: ReactNode
  description: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'surface-card-lg relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 p-6 backdrop-blur-xl sm:p-8',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
      <div className="relative">
        <div className="space-y-4">
          {badge ? <Badge variant="section">{badge}</Badge> : null}
          <div className="space-y-2">
            <h1 className="text-[2.2rem] leading-[1.05] text-foreground sm:text-[2.7rem]">
              {title}
            </h1>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
              {description}
            </p>
          </div>
        </div>
        <div className="mt-8">{children}</div>
        {footer ? <div className="mt-8 border-t border-border/60 pt-6">{footer}</div> : null}
      </div>
    </section>
  )
}

export function AuthField({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string
  error?: string | null
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-3">
        <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </label>
        {hint}
      </div>
      {children}
      {error ? <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  )
}

const fieldShellVariants = cva(
  'group flex min-h-14 items-center gap-3 rounded-2xl border border-border/70 bg-background/90 px-4 shadow-sm transition-[border-color,box-shadow,background-color] duration-200 backdrop-blur-sm hover:border-primary/15 focus-within:border-primary/30 focus-within:bg-card focus-within:shadow-[var(--shadow-accent)] focus-within:ring-2 focus-within:ring-primary/10',
  {
    variants: {
      invalid: {
        true: 'border-red-400/60 bg-red-50/60 focus-within:border-red-500 focus-within:ring-red-500/10 dark:bg-red-950/20',
        false: '',
      },
    },
    defaultVariants: {
      invalid: false,
    },
  },
)

export function AuthFieldShell({
  icon,
  trailing,
  invalid,
  children,
  className,
}: {
  icon?: ReactNode
  trailing?: ReactNode
  invalid?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn(fieldShellVariants({ invalid }), className)}>
      {icon ? <div className="shrink-0 text-primary/60">{icon}</div> : null}
      {children}
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  )
}

const messageVariants = cva(
  'rounded-2xl border px-4 py-3 text-sm',
  {
    variants: {
      variant: {
        error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300',
        success:
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300',
        info: 'border-primary/15 bg-primary/5 text-foreground',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
)

export function AuthMessage({
  className,
  variant,
  children,
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof messageVariants>) {
  return (
    <div className={cn(messageVariants({ variant }), className)}>
      {children}
    </div>
  )
}
