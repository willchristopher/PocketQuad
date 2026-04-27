# Supabase Realtime Integration for Chatroom

## Overview

The chatroom now includes **real-time message subscriptions** using Supabase Realtime. This enables:
- 🔄 **Live message delivery** - Messages appear instantly across all connected clients
- ✏️ **Real-time edits** - Message edits and deletions update automatically
- 🚀 **Optimistic updates** - Local messages appear immediately while syncing with the server
- 🔌 **Automatic reconnection** - Connection errors are handled gracefully

## Architecture

### Key Components

1. **Supabase Realtime Subscription** (`/lib/supabase/realtime.js`)
   - Existing utility that handles Postgres Change events
   - Supports INSERT, UPDATE, DELETE operations
   - Scoped to specific channels using filters

2. **useChatroom Hook** (`/hooks/useChatroom.js`)
   - Main state management hook for the chatroom
   - Integrates realtime subscriptions automatically
   - Handles optimistic updates and deduplication

3. **ChatMessage Components** (`/components/chat/`)
   - Display messages with realtime status
   - Show edit indicators and timestamps

## Implementation Details

### Realtime Subscription Setup

```javascript
import { subscribeToChannel } from '@/lib/supabase/realtime';

// Subscribe to message updates for a specific channel
const subscription = subscribeToChannel(channelId, (payload) => {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  
  // Handle INSERT: new message from another user
  if (eventType === 'INSERT' && newRecord?.user_id !== currentUserId) {
    addMessageToState(newRecord);
  }
  
  // Handle UPDATE: message edited
  if (eventType === 'UPDATE' && newRecord) {
    updateMessageInState(newRecord);
  }
  
  // Handle DELETE: message deleted
  if (eventType === 'DELETE' && oldRecord) {
    markMessageAsDeleted(oldRecord.id);
  }
});

// Cleanup on unmount
return () => subscription.unsubscribe();
```

### Hook Integration

The `useChatroom` hook automatically manages realtime subscriptions:

```javascript
const {
  channels,
  messages,           // Local message state, updated in realtime
  isLoading,         // Includes subscription status
  isSending,         // Message send in progress
  onSendMessage,     // Send with optimistic update
  onSelectChannel,   // Switch channels
  onDeleteMessage,   // Delete with realtime sync
  onEditMessage,     // Edit with realtime sync
  onReportMessage,   // Report inappropriate message
} = useChatroom(currentUserId);
```

### Message Flow

#### Sending a Message (Optimistic Update)
```
User types message
        ↓
Click send / Press Enter
        ↓
Optimistic UI update (message appears immediately)
        ↓
API POST request to /api/chat/channels/:id/messages
        ↓
Server persists to database
        ↓
Supabase triggers INSERT event
        ↓
Realtime subscription confirms delivery (deduped)
        ↓
Message marked as synced
```

#### Receiving Messages from Others
```
Other user sends message
        ↓
Server persists to database
        ↓
Supabase triggers INSERT event
        ↓
Our realtime subscription fires
        ↓
New message added to local state
        ↓
Message appears in chat automatically
```

#### Message Edit/Delete
```
User edits/deletes message
        ↓
Local state updated immediately
        ↓
API PATCH/DELETE request sent
        ↓
Server updates database
        ↓
Supabase triggers UPDATE/DELETE event
        ↓
Realtime subscription updates state
```

## Key Features

### 1. Deduplication
Prevents duplicate messages when local sends are confirmed by realtime:

```javascript
// Track locally sent messages
const localMessageIdsRef = useRef(new Set());

// When sending:
onSuccess: (newMessage) => {
  localMessageIdsRef.current.add(newMessage.id);
  // Auto-cleanup after 2 seconds
  setTimeout(() => localMessageIdsRef.current.delete(newMessage.id), 2000);
};
```

### 2. Automatic Sync on Channel Change
```javascript
useEffect(() => {
  if (selectedChannelId && channelMessages.length > 0) {
    setMessages(channelMessages);  // Initialize with fetched messages
    localMessageIdsRef.current.clear();
  }
}, [selectedChannelId, channelMessages.length]);
```

### 3. Error Handling
```javascript
try {
  subscription = subscribeToChannel(selectedChannelId, handleRealtimeUpdate);
  setIsSubscribing(false);
} catch (error) {
  console.error('Failed to subscribe to realtime updates:', error);
  setIsSubscribing(false);
  // Fall back to polling via React Query
}
```

### 4. Own Message Handling
Messages from the current user are handled separately:

```javascript
// Skip realtime update for own messages (already in state)
if (newRecord?.user_id !== currentUserId) {
  // Process message from another user
} else if (eventType === 'DELETE') {
  // Handle own message deletion (may come from admin)
}
```

## Database Events

Messages are mapped from the `chat_messages` table:

```
Event Type    | Condition            | Action
--------------+----------------------+-------------------------------------------
INSERT        | New message sent     | Add to message list
UPDATE        | Message edited       | Update content, set isEdited: true
DELETE        | Message deleted      | Mark as deleted, show [Deleted]
```

### Channel Filter
```javascript
filter: `channel_id=eq.${channelId}`
```

Only messages for the selected channel trigger updates.

## Performance Optimizations

### 1. Subscription Cleanup
```javascript
return () => {
  if (subscription) {
    subscription.unsubscribe();  // Unsubscribe when component unmounts
  }
};
```

### 2. Batched Updates
Updates are set via state callback to batch multiple rapid changes:

```javascript
setMessages((prev) => {
  // Apply transformations and return new state
});
```

### 3. Query Caching
React Query caches messages per channel:
```javascript
queryKey: ['messages', selectedChannelId]
```

### 4. Loading State
```javascript
isLoading: isLoadingChannels || isLoadingMessages || isSubscribing
// Reflects both initial load AND subscription status
```

## API Requirements

Your API should provide these endpoints:

```
GET  /api/chat/channels
     - Returns: Array of Channel objects

GET  /api/chat/channels/:channelId/messages
     - Returns: Array of ChatMessage objects

POST /api/chat/channels/:channelId/messages
     - Body: { content: string, replyToId?: string }
     - Returns: Created ChatMessage object

PATCH /api/chat/messages/:messageId
     - Body: { content: string }
     - Returns: Updated ChatMessage object

DELETE /api/chat/messages/:messageId
     - Returns: 204 No Content

POST /api/chat/messages/:messageId/report
     - Body: { reason: string }
     - Returns: ChatMessageReport object
```

## Row Level Security (RLS)

Enable realtime on `chat_messages` table in Supabase:

```sql
-- Enable realtime on chat_messages table
ALTER TABLE chat_messages REPLICA IDENTITY FULL;

-- Ensure RLS policies allow realtime access
CREATE POLICY "Users can view channel messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_members.channel_id = chat_messages.channel_id
      AND channel_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_members.channel_id = chat_messages.channel_id
      AND channel_members.user_id = auth.uid()
    )
  );
```

## Usage Example

```jsx
import { Chatroom } from '@/components/chat';
import { useChatroom } from '@/hooks/useChatroom';
import { useAuth } from '@/lib/auth/context';

export default function ChatPage() {
  const { user } = useAuth();
  const chatState = useChatroom(user?.id);

  return (
    <Chatroom
      {...chatState}
      currentUserId={user?.id}
    />
  );
}
```

## Debugging

Enable debug logging in the hook:

```javascript
// In useChatroom.js
subscription = subscribeToChannel(selectedChannelId, (payload) => {
  console.log('Realtime Update:', {
    eventType: payload.eventType,
    message: payload.new || payload.old,
    userId: payload.new?.user_id,
    currentUserId,
  });
  // ... handle update
});
```

Monitor subscription status:

```javascript
console.log({
  isSubscribing,
  selectedChannelId,
  messagesCount: messages.length,
  hasError: !!error,
});
```

## Network Conditions

The implementation handles:
- ✅ **Offline mode** - Messages queue via React Query for when connection returns
- ✅ **Slow connections** - Optimistic UI ensures responsive feel
- ✅ **Server errors** - API errors are caught and displayed
- ✅ **Connection drops** - Supabase auto-reconnects; React Query refetches stale data

## Known Limitations

1. **Message history**: Only shows messages fetched via API (not full history)
2. **Presence**: Currently no "typing" or "online" indicators (can be added with subscribeToPresence)
3. **Reactions**: Message reactions are not updated in realtime (can be added)
4. **Media**: File uploads not yet implemented

## Future Enhancements

1. Add presence tracking (who's online)
2. Add typing indicators
3. Add message reactions with realtime
4. Add file attachment support with S3
5. Add message search across history
6. Add message pinning
7. Add thread replies with realtime
8. Add voice/video call integration
