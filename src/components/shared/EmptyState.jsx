'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className, }) {
    return (<div className={cn('flex flex-col items-center justify-center text-center py-12 px-4', className)}>
      {Icon && (<div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-muted/60 shadow-sm">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden/>
        </div>)}
      <h3 className="font-body text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-xs font-body text-xs text-muted-foreground">{description}</p>}
      {actionLabel && onAction && (<button type="button" onClick={onAction} className="mt-4 rounded-xl bg-primary px-4 py-2 font-body text-xs font-semibold text-primary-foreground shadow-sm transition-[background-color,box-shadow] hover:bg-primary/90 hover:shadow-md">
          {actionLabel}
        </button>)}
    </div>);
}
