import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function subscribeToChannel(
  channelId: string,
  onMessage: (payload: unknown) => void,
) {
  const supabase = createSupabaseBrowserClient()

  return supabase
    .channel(`chat:${channelId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      },
      onMessage,
    )
    .subscribe()
}

export function subscribeToNotifications(
  userId: string,
  onNotification: (payload: unknown) => void,
) {
  const supabase = createSupabaseBrowserClient()

  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      onNotification,
    )
    .subscribe()
}

export function subscribeToOfficeHourQueue(
  officeHourId: string,
  onUpdate: (payload: unknown) => void,
) {
  const supabase = createSupabaseBrowserClient()

  return supabase
    .channel(`queue:${officeHourId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'office_hour_queue',
        filter: `office_hour_id=eq.${officeHourId}`,
      },
      onUpdate,
    )
    .subscribe()
}

export function subscribeToPresence(
  channelId: string,
  userId: string,
  onPresenceChange: (state: Record<string, unknown[]>) => void,
) {
  const supabase = createSupabaseBrowserClient()
  const channel = supabase.channel(`presence:${channelId}`, {
    config: { presence: { key: userId } },
  })

  channel
    .on('presence', { event: 'sync' }, () => {
      onPresenceChange(channel.presenceState())
    })
    .subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId, onlineAt: new Date().toISOString() })
      }
    })

  return channel
}
