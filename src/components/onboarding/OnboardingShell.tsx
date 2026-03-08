import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Search } from 'lucide-react'

import { AppBrand } from '@/components/auth/AuthShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function OnboardingShell({
  children,
  footer,
  currentStep,
  totalSteps,
}: {
  children: ReactNode
  footer: ReactNode
  currentStep: number
  totalSteps: number
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-7rem] h-[24rem] w-[24rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-11rem] right-[-10rem] h-[22rem] w-[22rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.045] [background-image:radial-gradient(circle,_#0f172a_1px,_transparent_1px)] [background-size:30px_30px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-4 py-8 sm:px-6">
        <AppBrand />
        <StepProgress currentStep={currentStep} totalSteps={totalSteps} className="mt-8 w-full max-w-lg" />
        <div className="mt-8 w-full max-w-2xl">{children}</div>
        <div className="mt-6 w-full max-w-2xl">{footer}</div>
      </div>
    </div>
  )
}

export function StepProgress({
  currentStep,
  totalSteps,
  className,
}: {
  currentStep: number
  totalSteps: number
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <Badge variant="section">Setup Progress</Badge>
        <p className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}
        </p>
      </div>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              index <= currentStep
                ? 'bg-[image:var(--gradient-primary)] shadow-accent'
                : 'bg-muted',
            )}
          />
        ))}
      </div>
    </div>
  )
}

export function StepCard({
  children,
  direction,
  className,
}: {
  children: ReactNode
  direction: 'forward' | 'backward'
  className?: string
}) {
  return (
    <section
      data-direction={direction}
      className={cn(
        'surface-card-lg animate-in-soft rounded-[2rem] border border-border/70 bg-card/90 p-6 backdrop-blur-xl sm:p-8',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function StepHeader({
  badge,
  icon,
  title,
  description,
}: {
  badge?: string
  icon?: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="mb-5 space-y-4">
      {badge ? <Badge variant="section">{badge}</Badge> : null}
      <div className="flex items-start gap-4">
        {icon ? (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-accent">
            {icon}
          </div>
        ) : null}
        <div className="space-y-1.5">
          <h2 className="text-[2rem] leading-[1.08] text-foreground sm:text-[2.4rem]">{title}</h2>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-[15px]">{description}</p>
        </div>
      </div>
    </div>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        variant="soft"
        inputSize="lg"
        className="pl-11"
      />
    </div>
  )
}

const selectionRowVariants = cva(
  'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200',
  {
    variants: {
      selected: {
        true: 'border-primary/25 bg-primary/[0.06] shadow-accent',
        false: 'border-border/70 bg-card/70 hover:-translate-y-0.5 hover:border-primary/15 hover:bg-card hover:shadow-surface',
      },
    },
    defaultVariants: {
      selected: false,
    },
  },
)

export function SelectionRow({
  selected,
  leading,
  title,
  description,
  meta,
  trailing,
  onClick,
  className,
}: {
  selected?: boolean
  leading?: ReactNode
  title: ReactNode
  description?: ReactNode
  meta?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  className?: string
}) {
  const content = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {description ? <div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div> : null}
        {meta ? <div className="mt-2">{meta}</div> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </>
  )

  if (!onClick) {
    return (
      <div className={cn(selectionRowVariants({ selected }), className)}>
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(selectionRowVariants({ selected }), className)}
    >
      {content}
    </button>
  )
}

export function ChoiceTile({
  selected,
  title,
  description,
  icon,
  detail,
  onClick,
  className,
}: {
  selected?: boolean
  title: ReactNode
  description: ReactNode
  icon: ReactNode
  detail?: ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-full flex-col items-start gap-4 rounded-2xl border p-5 text-left transition-all duration-200',
        selected
          ? 'border-primary/25 bg-primary/[0.06] shadow-accent'
          : 'border-border/70 bg-card/75 hover:-translate-y-0.5 hover:border-primary/15 hover:bg-card hover:shadow-surface',
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-accent">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {detail ? <div className="mt-auto text-xs text-muted-foreground">{detail}</div> : null}
      {selected ? <div className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-primary" /> : null}
    </button>
  )
}

export function StepToggle({
  enabled,
  onToggle,
  title,
  description,
}: {
  enabled: boolean
  onToggle: (next: boolean) => void
  title: string
  description?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className={cn(
        'flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-all duration-200',
        enabled
          ? 'border-primary/25 bg-primary/[0.06] shadow-accent'
          : 'border-border/70 bg-card/75 hover:border-primary/15 hover:shadow-surface',
      )}
    >
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div
        className={cn(
          'relative h-7 w-12 rounded-full transition-colors duration-200',
          enabled ? 'bg-primary' : 'bg-muted-foreground/25',
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200',
            enabled ? 'left-6' : 'left-1',
          )}
        />
      </div>
    </button>
  )
}

export function DayChip({
  selected,
  onClick,
  children,
}: {
  selected?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-200',
        selected
          ? 'border-primary/25 bg-primary/[0.06] text-primary'
          : 'border-border/70 bg-card/80 text-muted-foreground hover:border-primary/15 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

export function StepFooter({
  onBack,
  onSkip,
  onNext,
  disableBack,
  disableNext,
  isLastStep,
  submitting,
}: {
  onBack: () => void
  onSkip: () => void
  onNext: () => void
  disableBack: boolean
  disableNext: boolean
  isLastStep: boolean
  submitting: boolean
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Button
        type="button"
        variant="surface"
        size="xl"
        onClick={onBack}
        disabled={disableBack}
        className="justify-center sm:justify-start"
      >
        Back
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="xl"
        onClick={onSkip}
        disabled={submitting}
        className="order-3 text-muted-foreground sm:order-2"
      >
        Skip for now
      </Button>
      <Button
        type="button"
        variant="gradient"
        size="xl"
        onClick={onNext}
        disabled={disableNext}
        className="order-2 sm:order-3"
      >
        {submitting ? 'Finishing...' : isLastStep ? "Let's go" : 'Next'}
      </Button>
    </div>
  )
}

export function StatusPill({
  variant,
  children,
}: {
  variant?: VariantProps<typeof statusPillVariants>['variant']
  children: ReactNode
}) {
  return (
    <span className={cn(statusPillVariants({ variant }))}>
      {children}
    </span>
  )
}

const statusPillVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
  {
    variants: {
      variant: {
        granted: 'bg-primary/[0.1] text-primary',
        neutral: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
)
