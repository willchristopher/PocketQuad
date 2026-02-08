import { cn } from "@/lib/utils"

export const spanClasses = {
  small: 'col-span-12 md:col-span-4 lg:col-span-3',
  medium: 'col-span-12 md:col-span-6 lg:col-span-4',
  large: 'col-span-12 md:col-span-6 lg:col-span-8',
  full: 'col-span-12',
}

interface BentoWidgetProps {
  children: React.ReactNode
  className?: string
  span?: keyof typeof spanClasses
  title?: string
  icon?: React.ElementType
  action?: { label: string; href: string }
  noPadding?: boolean
}

export const BentoGrid = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("grid grid-cols-12 gap-4 md:gap-5 auto-rows-min", className)}>
    {children}
  </div>
)

export const BentoWidget = ({
  children, className, span = 'medium', title, icon: Icon, action, noPadding = false,
}: BentoWidgetProps) => (
  <div className={cn(
    spanClasses[span],
    "bg-card rounded-2xl border border-border/60 overflow-hidden flex flex-col relative group",
    "hover:border-border hover:shadow-lg hover:shadow-black/[0.03] dark:hover:shadow-black/20",
    "transition-all duration-300",
    className
  )}>
    {title && (
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
          )}
          <h3 className="font-display font-bold text-sm tracking-tight text-foreground">{title}</h3>
        </div>
        {action && (
          <a href={action.href} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
            {action.label} →
          </a>
        )}
      </div>
    )}
    <div className={cn("flex-1 overflow-auto", noPadding ? "" : "px-5 pb-5")}>
      {children}
    </div>
  </div>
)
