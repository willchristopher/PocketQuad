import { cn } from "@/lib/utils";

export const spanClasses = {
    small: 'col-span-12 md:col-span-6 xl:col-span-3',
    medium: 'col-span-12 md:col-span-6 xl:col-span-4',
    large: 'col-span-12 xl:col-span-8',
    full: 'col-span-12',
};

export const BentoGrid = ({ className, children }) => (
  <div className={cn("grid grid-cols-12 gap-5 md:gap-6 auto-rows-min", className)}>
    {children}
  </div>
);

export const BentoWidget = ({ children, className, span = 'medium', title, icon: Icon, action, noPadding = false, }) => (
  <div className={cn(
    spanClasses[span],
    "panel-card rounded-[1.5rem] overflow-hidden flex flex-col relative",
    "transition-shadow duration-300 hover:shadow-surface-lg",
    className
  )}>
    {title && (
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 md:px-6 md:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40 text-foreground/70">
              <Icon className="h-[15px] w-[15px]" weight="regular" />
            </div>
          )}
          <h3 className="truncate font-display text-lg tracking-tight text-foreground">{title}</h3>
        </div>
        {action && (
          <a href={action.href} className="shrink-0 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            {action.label}
          </a>
        )}
      </div>
    )}
    <div className={cn("flex-1 overflow-auto", noPadding ? "" : "px-5 pb-5 md:px-6 md:pb-6")}>
      {children}
    </div>
  </div>
);
