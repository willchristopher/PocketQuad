'use client';

import Link from 'next/link';
import { AlertCircle, Building2, Megaphone, Wrench } from 'lucide-react';

const scopeConfig = {
  CAMPUS: {
    icon: Megaphone,
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    label: 'Campus',
  },
  BUILDING: {
    icon: Building2,
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    label: 'Building',
  },
  SERVICE: {
    icon: Wrench,
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    label: 'Service',
  },
};

function formatAnnouncementTimestamp(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function ActiveAnnouncementsWidget({ announcements = [] }) {
  if (announcements.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/60 bg-background px-4 py-7 text-center text-xs text-muted-foreground">
        No active announcements right now.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {announcements.map((item) => {
        const config = scopeConfig[item.scope] ?? scopeConfig.CAMPUS;
        const Icon = config.icon;
        const href = item.linkUrl || '/notifications';
        const external = Boolean(item.linkUrl);

        return external ? (
          <a
            key={item.id}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="group block rounded-xl border border-border/50 p-3 transition-colors hover:bg-muted/35"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.className}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                  <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {item.audienceLabel || config.label}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
                <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                  {formatAnnouncementTimestamp(item.createdAt)}
                </p>
              </div>
            </div>
          </a>
        ) : (
          <Link
            key={item.id}
            href={href}
            className="group block rounded-xl border border-border/50 p-3 transition-colors hover:bg-muted/35"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.className}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                  <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {item.audienceLabel || config.label}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
                <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                  {formatAnnouncementTimestamp(item.createdAt)}
                </p>
              </div>
            </div>
          </Link>
        );
      })}

      <Link
        href="/notifications"
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
      >
        <AlertCircle className="h-3.5 w-3.5" />
        View all updates
      </Link>
    </div>
  );
}
