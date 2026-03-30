import { createSupabaseBrowserClient } from '@/lib/supabase/client';
function subscribeToTableChanges(channelName, { event, filter, table, }, callback) {
    const supabase = createSupabaseBrowserClient();
    return supabase
        .channel(channelName)
        .on('postgres_changes', {
        event,
        schema: 'public',
        table,
        filter,
    }, callback)
        .subscribe();
}
export function subscribeToChannel(channelId, onMessage) {
    return subscribeToTableChanges(`chat:${channelId}`, {
        event: '*',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
    }, onMessage);
}
export function subscribeToNotifications(userId, onNotification) {
    return subscribeToTableChanges(`notifications:${userId}`, {
        event: 'INSERT',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
    }, onNotification);
}
export function subscribeToOfficeHourQueue(officeHourId, onUpdate) {
    return subscribeToTableChanges(`queue:${officeHourId}`, {
        event: '*',
        table: 'office_hour_queue',
        filter: `office_hour_id=eq.${officeHourId}`,
    }, onUpdate);
}
export function subscribeToPresence(channelId, userId, onPresenceChange) {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(`presence:${channelId}`, {
        config: { presence: { key: userId } },
    });
    channel
        .on('presence', { event: 'sync' }, () => {
        onPresenceChange(channel.presenceState());
    })
        .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await channel.track({ userId, onlineAt: new Date().toISOString() });
        }
    });
    return channel;
}
