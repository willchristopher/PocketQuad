import { cn } from "@/lib/utils";
export const spanClasses = {
    small: 'col-span-12 md:col-span-6 xl:col-span-3',
    medium: 'col-span-12 md:col-span-6 xl:col-span-4',
    large: 'col-span-12 xl:col-span-8',
    full: 'col-span-12',
};
export const BentoGrid = ({ className, children }) => (<div className={cn("grid grid-cols-12 gap-5 md:gap-6 auto-rows-min", className)}>
    {children}
  </div>);
export const BentoWidget = ({ children, className, span = 'medium', title, icon: Icon, action, noPadding = false, }) => (<div className={cn(spanClasses[span], "panel-card rounded-[2rem] overflow-hidden flex flex-col relative group", "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-surface-lg", className)}>
    {title && (<div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 md:px-6 md:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.1rem] border border-border/70 bg-secondary text-primary">
              <Icon className="h-4 w-4"/>
            </div>)}
          <div className="min-w-0">
            <p className="poster-label">Dashboard module</p>
            <h3 className="truncate font-display text-xl tracking-tight text-foreground">{title}</h3>
          </div>
        </div>
        {action && (<a href={action.href} className="pill-btn shrink-0">
            {action.label}
          </a>)}
      </div>)}
    <div className={cn("flex-1 overflow-auto", noPadding ? "" : "px-5 pb-5 md:px-6 md:pb-6")}>
      {children}
    </div>
  </div>);
