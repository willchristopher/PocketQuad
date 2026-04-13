import { cva } from 'class-variance-authority';
import { Search } from 'lucide-react';
import { AppBrand } from '@/components/auth/AuthShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function OnboardingShell({ children, footer, currentStep, totalSteps }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-background" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-[56rem]">
          <div className="mx-auto max-w-2xl text-center">
            <AppBrand />
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              New account setup
            </p>
            <h1 className="mt-3 font-display text-[2rem] leading-[1.02] tracking-tight text-foreground sm:text-[2.5rem]">
              Set up your PocketQuad workspace
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[15px]">
              A short walkthrough to personalize your campus experience before you land in the app.
            </p>
          </div>

          <section className="surface-card-lg mt-8 rounded-[30px] border border-border/70 bg-card/95 p-5 shadow-[0_24px_60px_rgba(0,33,68,0.08)] sm:p-8 lg:p-10">
            <StepProgress currentStep={currentStep} totalSteps={totalSteps} />
            <div className="mt-8">{children}</div>
            <div className="mt-8">{footer}</div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function StepProgress({ currentStep, totalSteps, className }) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Badge variant="section">Setup Progress</Badge>
        <p className="text-sm text-muted-foreground" aria-live="polite" aria-atomic="true">
          Step {currentStep + 1} of {totalSteps}
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={currentStep + 1}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Setup progress: step ${currentStep + 1} of ${totalSteps}`}
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              index <= currentStep ? 'bg-msu-gold' : 'bg-muted'
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function StepCard({ children, direction, className }) {
  return (
    <section
      data-direction={direction}
      className={cn(
        'animate-in-soft rounded-[24px] border border-border/70 bg-muted/[0.35] p-6 sm:p-8',
        className
      )}
    >
      {children}
    </section>
  );
}

export function StepHeader({ badge, icon, title, description }) {
  return (
    <div className="mb-6 space-y-4">
      {badge ? <Badge variant="section">{badge}</Badge> : null}
      <div className="flex items-start gap-4">
        {icon ? (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-msu-blue text-white shadow-md">
            {icon}
          </div>
        ) : null}
        <div className="space-y-2">
          <h2 className="font-display text-[1.85rem] leading-[1.04] tracking-tight text-foreground sm:text-[2.2rem]">
            {title}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SearchField({ value, onChange, placeholder, className }) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder || 'Search'}
        variant="soft"
        inputSize="lg"
        className="pl-11"
      />
    </div>
  );
}

const selectionRowVariants = cva(
  'flex min-h-11 w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors duration-200',
  {
    variants: {
      selected: {
        true: 'border-primary/20 bg-primary/[0.05] shadow-sm',
        false: 'border-border/70 bg-card/85 hover:border-primary/15 hover:bg-card hover:shadow-sm',
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
);

export function SelectionRow({
  selected,
  leading,
  title,
  description,
  meta,
  trailing,
  onClick,
  className,
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
  );

  if (!onClick) {
    return <div className={cn(selectionRowVariants({ selected }), className)}>{content}</div>;
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(selectionRowVariants({ selected }), className)}
    >
      {content}
    </button>
  );
}

export function ChoiceTile({ selected, title, description, icon, detail, onClick, className }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'relative flex h-full flex-col items-start gap-4 rounded-2xl border p-5 text-left transition-colors duration-200',
        selected
          ? 'border-primary/20 bg-primary/[0.05] shadow-sm'
          : 'border-border/70 bg-card/85 hover:border-primary/15 hover:bg-card hover:shadow-sm',
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-msu-blue text-white shadow-sm" aria-hidden="true">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {detail ? <div className="mt-auto text-xs text-muted-foreground">{detail}</div> : null}
      {selected ? <div className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-msu-gold" aria-hidden="true" /> : null}
    </button>
  );
}

export function StepToggle({ enabled, onToggle, title, description }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onToggle(!enabled)}
      className={cn(
        'flex min-h-11 w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-colors duration-200',
        enabled
          ? 'border-primary/20 bg-primary/[0.05] shadow-sm'
          : 'border-border/70 bg-card/85 hover:border-primary/15 hover:shadow-sm'
      )}
    >
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div
        aria-hidden="true"
        className={cn(
          'relative h-7 w-12 rounded-full transition-colors duration-200',
          enabled ? 'bg-msu-blue' : 'bg-muted-foreground/25'
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200',
            enabled ? 'left-6' : 'left-1'
          )}
        />
      </div>
    </button>
  );
}

export function DayChip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'min-h-11 rounded-full border px-4 py-2 text-xs font-semibold transition-colors duration-200',
        selected
          ? 'border-primary/20 bg-primary/[0.05] text-primary'
          : 'border-border/70 bg-card/85 text-muted-foreground hover:border-primary/15 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

export function StepFooter({
  onBack,
  onSkip,
  onNext,
  disableBack,
  disableNext,
  isLastStep,
  submitting,
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
        size="xl"
        onClick={onNext}
        disabled={disableNext}
        className="order-2 bg-msu-gold text-msu-blue hover:shadow-md sm:order-3"
      >
        {submitting ? 'Finishing...' : isLastStep ? "Let's go" : 'Next'}
      </Button>
    </div>
  );
}

export function StatusPill({ variant, children }) {
  return <span className={cn(statusPillVariants({ variant }))}>{children}</span>;
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
  }
);
