'use client'

import Link from 'next/link'

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
    markRead,
  } = useNotificationInbox({ limit: 4 })

  return (
    <div className="space-y-3">
      <div className="subtle-panel flex items-center justify-between gap-3 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Unread updates</span>
          <NotificationBadge count={unreadCount} />
        </div>

      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-background px-4 py-7 text-center text-xs text-muted-foreground">
          You&apos;re caught up. New faculty changes and campus announcements will land here.
        </p>
      ) : (
        <div className="space-y-2">
          {notifications.map((item) => {
            const meta = getNotificationMeta(item.type)
            const Icon = meta.icon
            const external = isExternalNotificationUrl(item.actionUrl)
            const isUpdating = updatingId === item.id
            const isPending = isUpdating

            const cardClassName = cn(
              'rounded-xl border px-4 py-3.5 transition-colors duration-200',
              item.read
                ? 'border-border/50 bg-card'
                : 'border-primary/20 bg-secondary/45 shadow-md',
              isPending && 'opacity-70',
            )

            const content = (
              <>
                <div className="flex items-start gap-3">
                  <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', meta.iconClassName)}>
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

            const actionClassName = 'block rounded-xl text-left transition-colors duration-200 hover:bg-muted'
            const fallbackHref = '/notifications'
            const targetHref = item.actionUrl || fallbackHref

            if (external) {
              return (
                <div key={item.id} className={cardClassName}>
                  <a
                    href={targetHref}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      if (!item.read) {
                        void markRead(item.id)
                      }
                    }}
                    className={cn(actionClassName, 'block min-w-0')}
                    data-card-interactive="true"
                  >
                    {content}
                  </a>
                </div>
              )
            }

            return (
              <div key={item.id} className={cardClassName}>
                <Link
                  href={targetHref}
                  onClick={() => {
                    if (!item.read) {
                      void markRead(item.id)
                    }
                  }}
                  className={cn(actionClassName, 'block min-w-0')}
                  data-card-interactive="true"
                >
                  {content}
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
