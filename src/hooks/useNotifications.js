'use client'

import React from 'react'

import { useAuth } from '@/lib/auth/context'
import { ApiClientError, apiRequest } from '@/lib/api/client'
import { subscribeToNotifications } from '@/lib/supabase/realtime'

const NOTIFICATION_SYNC_EVENT = 'pocketquad:notifications-updated'

function getNotificationError(error, fallback) {
  return error instanceof ApiClientError ? error.message : fallback
}

function dispatchNotificationSync() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(NOTIFICATION_SYNC_EVENT))
}

function useNotificationSubscription(userId, onChange) {
  React.useEffect(() => {
    if (!userId) {
      return undefined
    }

    const realtime = subscribeToNotifications(userId, () => {
      void onChange()
    })

    return () => {
      void realtime.unsubscribe()
    }
  }, [onChange, userId])
}

function useNotificationSync(userId, onChange) {
  React.useEffect(() => {
    if (!userId || typeof window === 'undefined') {
      return undefined
    }

    const handleChange = () => {
      void onChange()
    }

    window.addEventListener(NOTIFICATION_SYNC_EVENT, handleChange)

    return () => {
      window.removeEventListener(NOTIFICATION_SYNC_EVENT, handleChange)
    }
  }, [onChange, userId])
}

export function useUnreadNotificationCount() {
  const { profile } = useAuth()
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [loading, setLoading] = React.useState(true)

  const refresh = React.useCallback(async () => {
    if (!profile?.id) {
      setUnreadCount(0)
      setLoading(false)
      return
    }

    try {
      const result = await apiRequest('/api/notifications?unread=true&countOnly=true')
      setUnreadCount(result.count)
    } catch {
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  useNotificationSubscription(profile?.id, refresh)
  useNotificationSync(profile?.id, refresh)

  return {
    unreadCount,
    loading,
    refresh,
  }
}

export function useNotificationInbox({ limit = 20 } = {}) {
  const { profile } = useAuth()
  const [notifications, setNotifications] = React.useState([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [updatingId, setUpdatingId] = React.useState(null)
  const [clearingId, setClearingId] = React.useState(null)
  const [markingAll, setMarkingAll] = React.useState(false)

  const refresh = React.useCallback(async ({ silent = false } = {}) => {
    if (!profile?.id) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      setRefreshing(false)
      return
    }

    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError(null)

    try {
      const [itemsResult, countResult] = await Promise.all([
        apiRequest(`/api/notifications?limit=${limit}`),
        apiRequest('/api/notifications?unread=true&countOnly=true'),
      ])

      setNotifications(itemsResult.items)
      setUnreadCount(countResult.count)
    } catch (loadError) {
      setNotifications([])
      setUnreadCount(0)
      setError(getNotificationError(loadError, 'Unable to load notifications'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [limit, profile?.id])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  useNotificationSubscription(profile?.id, React.useCallback(async () => {
    await refresh({ silent: true })
  }, [refresh]))
  useNotificationSync(profile?.id, React.useCallback(async () => {
    await refresh({ silent: true })
  }, [refresh]))

  const markRead = React.useCallback(async (id) => {
    setUpdatingId(id)
    setError(null)

    try {
      await apiRequest(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      })

      setNotifications((current) => current.map((item) => (
        item.id === id ? { ...item, read: true } : item
      )))
      setUnreadCount((current) => Math.max(0, current - 1))
      dispatchNotificationSync()
    } catch (updateError) {
      setError(getNotificationError(updateError, 'Unable to update notification'))
    } finally {
      setUpdatingId(null)
    }
  }, [])

  const clearNotification = React.useCallback(async (id) => {
    setClearingId(id)
    setError(null)

    try {
      await apiRequest(`/api/notifications/${id}`, {
        method: 'DELETE',
      })

      setNotifications((current) => {
        const target = current.find((item) => item.id === id)

        if (target && !target.read) {
          setUnreadCount((existing) => Math.max(0, existing - 1))
        }

        return current.filter((item) => item.id !== id)
      })
      dispatchNotificationSync()
    } catch (updateError) {
      setError(getNotificationError(updateError, 'Unable to clear notification'))
    } finally {
      setClearingId(null)
    }
  }, [])

  const markAllRead = React.useCallback(async () => {
    setMarkingAll(true)
    setError(null)

    try {
      await apiRequest('/api/notifications/read-all', {
        method: 'POST',
      })

      setNotifications((current) => current.map((item) => ({ ...item, read: true })))
      setUnreadCount(0)
      dispatchNotificationSync()
    } catch (updateError) {
      setError(getNotificationError(updateError, 'Unable to mark all notifications read'))
    } finally {
      setMarkingAll(false)
    }
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    refreshing,
    error,
    updatingId,
    clearingId,
    markingAll,
    refresh,
    markRead,
    clearNotification,
    markAllRead,
  }
}
