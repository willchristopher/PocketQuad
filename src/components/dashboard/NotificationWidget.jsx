'use client'

import Link from 'next/link'
import { CheckCheck } from 'lucide-react'

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
    markingAll,
    markRead,
    markAllRead,
  } = useNotificationInbox({ limit: 4 })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/10 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Unread updates</span>
          <NotificationBadge count={unreadCount} />
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={markingAll}
            className="inline-flex items-center gap-1 rounded-lg text-xs font-semibold text-primary transition-colors hover:text-primary/80 disabled:opacity-60"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {markingAll ? 'Updating...' : 'Mark all read'}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
          You&apos;re caught up. New faculty changes and campus announcements will land here.
        </p>
      ) : (
        <div className="space-y-2">
          {notifications.map((item) => {
            const meta = getNotificationMeta(item.type)
            const Icon = meta.icon
            const external = isExternalNotificationUrl(item.actionUrl)

            const cardClassName = cn(
              'block rounded-xl border px-3 py-3 transition-colors hover:bg-muted/25',
              item.read
                ? 'border-border/50 bg-muted/5'
                : 'border-primary/20 bg-primary/[0.04]',
            )

            const content = (
              <>
                <div className="flex items-start gap-3">
                  <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', meta.iconClassName)}>
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

            if (item.actionUrl) {
              if (external) {
                return (
                  <a
                    key={item.id}
                    href={item.actionUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      if (!item.read) {
                        void markRead(item.id)
                      }
                    }}
                    className={cn(cardClassName, updatingId === item.id && 'opacity-70')}
                  >
                    {content}
                  </a>
                )
              }

              return (
                <Link
                  key={item.id}
                  href={item.actionUrl}
                  onClick={() => {
                    if (!item.read) {
                      void markRead(item.id)
                    }
                  }}
                  className={cn(cardClassName, updatingId === item.id && 'opacity-70')}
                >
                  {content}
                </Link>
              )
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (!item.read) {
                    void markRead(item.id)
                  }
                }}
                className={cn(cardClassName, 'w-full text-left', updatingId === item.id && 'opacity-70')}
              >
                {content}
              </button>
            )
          })}
        </div>
      )}

      <Link href="/notifications" className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80">
        Open full inbox
      </Link>
    </div>
  )
}
