'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';

export const spanClasses = {
    small: 'col-span-12 md:col-span-6 xl:col-span-3',
    medium: 'col-span-12 md:col-span-6 xl:col-span-4',
    large: 'col-span-12 xl:col-span-8',
    full: 'col-span-12',
};

export const BentoGrid = ({ className, children }) => (
  <div className={cn('grid grid-cols-12 auto-rows-min gap-5 md:gap-6', className)}>
    {children}
  </div>
);

function clickCameFromInteractiveChild(target, currentTarget) {
  if (!(target instanceof HTMLElement) || !(currentTarget instanceof HTMLElement)) {
    return false;
  }

  const interactiveAncestor = target.closest(
    'a, button, input, select, textarea, summary, [role="button"], [role="link"], [data-card-interactive="true"]',
  );

  return Boolean(interactiveAncestor && interactiveAncestor !== currentTarget);
}

export const BentoWidget = ({
  children,
  className,
  span = 'medium',
  title,
  icon: Icon,
  action,
  noPadding = false,
  asLink = false,
}) => {
  const router = useRouter();

  const handleNavigate = () => {
    if (action?.href) {
      router.push(action.href);
    }
  };

  const sharedProps = {
    className: cn(
      spanClasses[span],
      'panel-card relative flex flex-col overflow-hidden rounded-xl transition-shadow duration-300 hover:shadow-lg',
      action && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
      className,
    ),
  };

  if (action?.href && asLink) {
    return (
      <Link
        href={action.href}
        {...sharedProps}
        aria-label={action.label ?? title ?? 'Open card'}
      >
        {title ? (
          <div className="flex items-start gap-4 px-5 pb-4 pt-5 md:px-6 md:pb-4 md:pt-6">
            <div className="flex min-w-0 items-center gap-3">
              {Icon ? (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40 text-foreground/70">
                  <Icon className="h-[15px] w-[15px]" weight="regular" />
                </div>
              ) : null}
              <h3 className="truncate font-display text-lg tracking-tight text-foreground">{title}</h3>
            </div>
          </div>
        ) : null}
        <div className={cn('flex-1 overflow-auto', noPadding ? '' : 'px-5 pb-5 md:px-6 md:pb-6')}>
          {children}
        </div>
      </Link>
    );
  }

  return (
    <div
      {...sharedProps}
      onClick={(event) => {
        if (!action || clickCameFromInteractiveChild(event.target, event.currentTarget)) {
          return;
        }

        handleNavigate();
      }}
      onKeyDown={(event) => {
        if (!action || clickCameFromInteractiveChild(event.target, event.currentTarget)) {
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleNavigate();
        }
      }}
      role={action ? 'link' : undefined}
      tabIndex={action ? 0 : undefined}
    >
      {title ? (
        <div className="flex items-start gap-4 px-5 pb-4 pt-5 md:px-6 md:pb-4 md:pt-6">
          <div className="flex min-w-0 items-center gap-3">
            {Icon ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40 text-foreground/70">
                <Icon className="h-[15px] w-[15px]" weight="regular" />
              </div>
            ) : null}
            <h3 className="truncate font-display text-lg tracking-tight text-foreground">{title}</h3>
          </div>
        </div>
      ) : null}
      <div className={cn('flex-1 overflow-auto', noPadding ? '' : 'px-5 pb-5 md:px-6 md:pb-6')}>
        {children}
      </div>
    </div>
  );
};
