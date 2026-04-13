'use client';

import { cn } from '@/lib/utils';

export function NotificationBadge({ count = 0, className }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shadow-sm',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
