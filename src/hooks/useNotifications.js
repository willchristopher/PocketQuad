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
  const initialCount = profile?.unreadNotificationCount ?? 0
  const hasHydratedUnreadCount = typeof profile?.unreadNotificationCount === 'number'
  const [unreadCount, setUnreadCount] = React.useState(initialCount)
  const [loading, setLoading] = React.useState(profile?.id ? !hasHydratedUnreadCount : false)

  React.useEffect(() => {
    setUnreadCount(profile?.unreadNotificationCount ?? 0)
    setLoading(profile?.id ? typeof profile?.unreadNotificationCount !== 'number' : false)
  }, [profile?.id, profile?.unreadNotificationCount])

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
    if (!profile?.id || hasHydratedUnreadCount) {
      return
    }

    void refresh()
  }, [hasHydratedUnreadCount, profile?.id, refresh])

  useNotificationSubscription(profile?.id, refresh)
  useNotificationSync(profile?.id, refresh)

  return {
    unreadCount,
    loading,
    refresh,
  }
}

export function useNotificationInbox({ limit = 20, initialData = null } = {}) {
  const { profile } = useAuth()
  const [notifications, setNotifications] = React.useState(initialData?.items ?? [])
  const [unreadCount, setUnreadCount] = React.useState(initialData?.unreadCount ?? profile?.unreadNotificationCount ?? 0)
  const [loading, setLoading] = React.useState(initialData ? false : true)
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
      const itemsResult = await apiRequest(`/api/notifications?limit=${limit}`)
      setNotifications(itemsResult.items)
      setUnreadCount(itemsResult.unreadCount ?? 0)
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
    if (initialData) {
      return undefined
    }

    void refresh()
    return undefined
  }, [initialData, refresh])

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
