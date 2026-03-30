'use client'

import Link from 'next/link'
import { CheckCheck, X } from 'lucide-react'

import { NotificationBadge } from '@/components/notifications/NotificationBadge'
import { useNotificationInbox } from '@/hooks/useNotifications'
import {
  formatNotificationTimestamp,
  getNotificationMeta,
  isExternalNotificationUrl,
} from '@/lib/notifications'
import { cn } from '@/lib/utils'

export function NotificationWidget() {
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
  } = useNotificationInbox({ limit: 4 })

  return (
    <div className="space-y-3">
      <div className="subtle-panel flex items-center justify-between gap-3 rounded-[1.3rem] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Unread updates</span>
          <NotificationBadge count={unreadCount} />
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={markingAll}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary transition-colors hover:border-primary/25 hover:bg-muted disabled:opacity-60"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {markingAll ? 'Updating...' : 'Mark all read'}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-[1.2rem] border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p className="rounded-[1.3rem] border border-dashed border-border/60 bg-background px-4 py-7 text-center text-xs text-muted-foreground">
          You&apos;re caught up. New faculty changes and campus announcements will land here.
        </p>
      ) : (
        <div className="space-y-2">
          {notifications.map((item) => {
            const meta = getNotificationMeta(item.type)
            const Icon = meta.icon
            const external = isExternalNotificationUrl(item.actionUrl)
            const isUpdating = updatingId === item.id
            const isClearing = clearingId === item.id
            const isPending = isUpdating || isClearing

            const cardClassName = cn(
              'rounded-[1.25rem] border px-4 py-3.5 transition-all duration-200',
              item.read
                ? 'border-border/50 bg-card'
                : 'border-primary/20 bg-secondary/45 shadow-surface',
              isPending && 'opacity-70',
            )

            const content = (
              <>
                <div className="flex items-start gap-3">
                  <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem]', meta.iconClassName)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-semibold">{item.title}</p>
                      {!item.read ? <span className="mt-1 h-2 w-2 rounded-full bg-primary" /> : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', meta.badgeClassName)}>
                        {meta.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatNotificationTimestamp(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
                  </div>
                </div>
              </>
            )

            const actionClassName = 'block rounded-[1rem] text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted'

            if (item.actionUrl) {
              if (external) {
                return (
                  <div key={item.id} className={cardClassName}>
                    <div className="flex items-start gap-3">
                      <a
                        href={item.actionUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          if (!item.read) {
                            void markRead(item.id)
                          }
                        }}
                        className={cn(actionClassName, 'min-w-0 flex-1')}
                      >
                        {content}
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
                )
              }

              return (
                <div key={item.id} className={cardClassName}>
                  <div className="flex items-start gap-3">
                    <Link
                      href={item.actionUrl}
                      onClick={() => {
                        if (!item.read) {
                          void markRead(item.id)
                        }
                      }}
                      className={cn(actionClassName, 'min-w-0 flex-1')}
                    >
                      {content}
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
              )
            }

            return (
              <div key={item.id} className={cardClassName}>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!item.read) {
                        void markRead(item.id)
                      }
                    }}
                    className={cn(actionClassName, 'min-w-0 flex-1')}
                  >
                    {content}
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
            )
          })}
        </div>
      )}

      <Link href="/notifications" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary transition-colors hover:text-primary/80">
        Open full inbox
      </Link>
    </div>
  )
}
