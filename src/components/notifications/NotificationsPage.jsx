'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, CheckCheck, X } from 'lucide-react';
import { useNotificationInbox } from '@/hooks/useNotifications';
import {
  formatNotificationTimestamp,
  getNotificationFilter,
  getNotificationMeta,
  isExternalNotificationUrl,
  notificationFilters,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';

export function NotificationsPage({ initialData = null }) {
  const [activeFilter, setActiveFilter] = React.useState('All');
  const {
    notifications,
    unreadCount,
    loading,
    error,
    updatingId,
    clearingId,
    markingAll,
    markRead,
    clearNotification,
    markAllRead,
  } = useNotificationInbox({ limit: 100, initialData });

  const filtered = notifications.filter((item) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Unread') return !item.read;
    return getNotificationFilter(item.type) === activeFilter;
  });

  return (
    <div className="space-y-6">
      {unreadCount > 0 ? (
        <div className="flex justify-end animate-in-up">
          <button
            onClick={() => void markAllRead()}
            disabled={markingAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3.5 py-2 text-sm font-semibold transition-all duration-200 hover:bg-muted/35 disabled:opacity-70"
          >
            <CheckCheck className="h-4 w-4" />
            {markingAll ? 'Updating...' : 'Mark all read'}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <section className="flex flex-wrap gap-2 animate-in-up stagger-1">
        {notificationFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200',
              activeFilter === filter
                ? 'border-primary bg-primary text-primary-foreground shadow-lg'
                : 'border-border/60 text-muted-foreground hover:bg-muted/40',
            )}
          >
            {filter}
          </button>
        ))}
      </section>

      <section className="space-y-2.5">
        {loading ? <p className="text-sm text-muted-foreground">Loading notifications...</p> : null}

        {!loading
          ? filtered.map((item, index) => {
              const meta = getNotificationMeta(item.type);
              const Icon = meta.icon;
              const external = isExternalNotificationUrl(item.actionUrl);
              const isUpdating = updatingId === item.id;
              const isClearing = clearingId === item.id;
              const isPending = isUpdating || isClearing;
              const body = (
                <div className="flex items-start gap-3">
                  <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta.iconClassName)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">{item.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', meta.badgeClassName)}>
                            {meta.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{formatNotificationTimestamp(item.createdAt)}</span>
                        </div>
                      </div>
                      {!item.read ? <span className="mt-1 h-2 w-2 rounded-full bg-primary" /> : null}
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{item.message}</p>
                    {item.actionUrl ? (
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        {item.actionLabel ?? 'Open'}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                  </div>
                </div>
              );
              const className = cn(
                'w-full rounded-xl border p-4 transition-all duration-200 animate-in-up',
                item.read
                  ? 'border-border/60 bg-card hover:bg-muted/25'
                  : 'border-primary/25 bg-primary/[0.04] hover:bg-primary/[0.07]',
                isPending && 'opacity-70',
              );
              const actionClassName = 'block min-w-0 flex-1 rounded-xl text-left transition-all duration-200';
              const style = { animationDelay: `${0.035 * (index + 1)}s` };

              if (item.actionUrl && external) {
                return (
                  <div key={item.id} className={className} style={style}>
                    <div className="flex items-start gap-3">
                      <a
                        href={item.actionUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          if (!item.read) {
                            void markRead(item.id);
                          }
                        }}
                        className={actionClassName}
                      >
                        {body}
                      </a>
                      <button
                        type="button"
                        onClick={() => void clearNotification(item.id)}
                        disabled={isClearing}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground disabled:opacity-60"
                        aria-label={`Clear ${item.title}`}
                      >
                        <X className="h-3.5 w-3.5" />
                        {isClearing ? 'Clearing...' : 'Clear'}
                      </button>
                    </div>
                  </div>
                );
              }

              if (item.actionUrl) {
                return (
                  <div key={item.id} className={className} style={style}>
                    <div className="flex items-start gap-3">
                      <Link
                        href={item.actionUrl}
                        onClick={() => {
                          if (!item.read) {
                            void markRead(item.id);
                          }
                        }}
                        className={actionClassName}
                      >
                        {body}
                      </Link>
                      <button
                        type="button"
                        onClick={() => void clearNotification(item.id)}
                        disabled={isClearing}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground disabled:opacity-60"
                        aria-label={`Clear ${item.title}`}
                      >
                        <X className="h-3.5 w-3.5" />
                        {isClearing ? 'Clearing...' : 'Clear'}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={item.id} className={className} style={style}>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (!item.read) {
                          void markRead(item.id);
                        }
                      }}
                      className={actionClassName}
                    >
                      {body}
                    </button>
                    <button
                      type="button"
                      onClick={() => void clearNotification(item.id)}
                      disabled={isClearing}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground disabled:opacity-60"
                      aria-label={`Clear ${item.title}`}
                    >
                      <X className="h-3.5 w-3.5" />
                      {isClearing ? 'Clearing...' : 'Clear'}
                    </button>
                  </div>
                </div>
              );
            })
          : null}
      </section>

      {!loading && filtered.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border/60 bg-card p-10 text-center text-sm text-muted-foreground animate-in-up">
          No notifications in this filter.
        </section>
      ) : null}
    </div>
  );
}
