'use client'

import React from 'react'
import { Bell, CheckCheck, Megaphone } from 'lucide-react'

import { useAuth } from '@/lib/auth/context'
import { ApiClientError, apiRequest } from '@/lib/api/client'
import { subscribeToNotifications } from '@/lib/supabase/realtime'
import { cn } from '@/lib/utils'

type NotificationItem = {
  id: string
  title: string
  message: string
  createdAt: string
  type: 'OFFICE_HOUR' | 'NEW_EVENT' | 'EVENT_CANCELLED' | 'DEADLINE' | 'ANNOUNCEMENT' | 'SYSTEM'
  read: boolean
}

type NotificationsResponse = {
  items: NotificationItem[]
  page: number
  limit: number
  total: number
  hasMore: boolean
}

const filters = ['All', 'Unread', 'Announcements', 'Events', 'Deadlines', 'System'] as const

type FilterValue = (typeof filters)[number]

function typeToFilter(type: NotificationItem['type']): FilterValue {
  if (type === 'ANNOUNCEMENT') return 'Announcements'
  if (type === 'NEW_EVENT' || type === 'EVENT_CANCELLED') return 'Events'
  if (type === 'DEADLINE') return 'Deadlines'
  return 'System'
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function NotificationsPage() {
  const { profile } = useAuth()
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [activeFilter, setActiveFilter] = React.useState<FilterValue>('All')
  const [loading, setLoading] = React.useState(true)
  const [updating, setUpdating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadNotifications = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await apiRequest<NotificationsResponse>('/api/notifications?limit=100')
      setNotifications(result.items)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to load notifications'
      setError(message)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  React.useEffect(() => {
    if (!profile?.id) return

    const realtime = subscribeToNotifications(profile.id, () => {
      void loadNotifications()
    })

    return () => {
      void realtime.unsubscribe()
    }
  }, [loadNotifications, profile?.id])

  const unreadCount = notifications.filter((item) => !item.read).length

  const filtered = notifications.filter((item) => {
    if (activeFilter === 'All') return true
    if (activeFilter === 'Unread') return !item.read
    return typeToFilter(item.type) === activeFilter
  })

  const markOneRead = async (id: string) => {
    setUpdating(true)
    setError(null)

    try {
      await apiRequest(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      })
      setNotifications((previous) =>
        previous.map((item) => (item.id === id ? { ...item, read: true } : item)),
      )
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to mark notification read'
      setError(message)
    } finally {
      setUpdating(false)
    }
  }

  const markAllRead = async () => {
    setUpdating(true)
    setError(null)

    try {
      await apiRequest('/api/notifications/read-all', {
        method: 'POST',
      })
      setNotifications((previous) => previous.map((item) => ({ ...item, read: true })))
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to mark all notifications read'
      setError(message)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between animate-in-up">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread campus update${unreadCount === 1 ? '' : 's'}`
              : 'All campus updates are read.'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => void markAllRead()}
            disabled={updating}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3.5 py-2 text-sm font-semibold transition-all duration-200 hover:bg-muted/35 disabled:opacity-70"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="flex flex-wrap gap-2 animate-in-up stagger-1">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200',
              activeFilter === filter
                ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'border-border/60 text-muted-foreground hover:bg-muted/40',
            )}
          >
            {filter}
          </button>
        ))}
      </section>

      <section className="space-y-2.5">
        {loading && <p className="text-sm text-muted-foreground">Loading notifications...</p>}

        {!loading && filtered.map((item, index) => (
          <button
            key={item.id}
            onClick={() => {
              if (!item.read) {
                void markOneRead(item.id)
              }
            }}
            className={cn(
              'w-full rounded-2xl border p-4 text-left transition-all duration-200 hover-lift animate-in-up',
              item.read
                ? 'border-border/60 bg-card hover:bg-muted/25'
                : 'border-primary/25 bg-primary/[0.04] hover:bg-primary/[0.07]',
            )}
            style={{ animationDelay: `${0.035 * (index + 1)}s` }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-muted p-2 text-muted-foreground">
                {item.type === 'ANNOUNCEMENT' ? <Megaphone className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-semibold text-foreground">{item.title}</p>
                  {!item.read && <span className="mt-1 h-2 w-2 rounded-full bg-primary" />}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {item.type.replaceAll('_', ' ')} | {formatTime(item.createdAt)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </section>

      {!loading && filtered.length === 0 && (
        <section className="rounded-2xl border border-dashed border-border/60 bg-card p-10 text-center text-sm text-muted-foreground animate-in-up">
          No notifications in this filter.
        </section>
      )}
    </div>
  )
}
