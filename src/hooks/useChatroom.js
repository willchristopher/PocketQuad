import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { subscribeToChannel } from '@/lib/supabase/realtime';

export function useChatroom(currentUserId) {
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const localMessageIdsRef = useRef(new Set());
  const {
    data: channels = [],
    isLoading: isLoadingChannels,
    error: channelsError,
  } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const response = await fetch('/api/chat/channels');
      if (!response.ok) throw new Error('Failed to fetch channels');
      return response.json();
    },
  });

  useEffect(() => {
    if (channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  const {
    data: channelMessages = [],
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['messages', selectedChannelId],
    queryFn: async () => {
      if (!selectedChannelId) return [];
      const response = await fetch(
        `/api/chat/channels/${selectedChannelId}/messages`
      );
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!selectedChannelId,
  });

  // Initialize messages on channel change
  useEffect(() => {
    if (selectedChannelId && channelMessages.length > 0) {
      setMessages(channelMessages);
      localMessageIdsRef.current.clear();
    }
  }, [selectedChannelId, channelMessages.length]);

  // Subscribe to realtime message updates
  useEffect(() => {
    if (!selectedChannelId || !currentUserId) {
      return;
    }

    setIsSubscribing(true);
    let subscription;

    try {
      // Subscribe to channel for new messages, edits, and deletions
      subscription = subscribeToChannel(selectedChannelId, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        // Handle messages from other users
        if (newRecord?.user_id !== currentUserId) {
          if (eventType === 'INSERT' && newRecord) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.find((m) => m.id === newRecord.id)) {
                return prev;
              }
              return [...prev, newRecord];
            });
          } else if (eventType === 'UPDATE' && newRecord) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === newRecord.id ? { ...m, ...newRecord, isEdited: true } : m
              )
            );
          } else if (eventType === 'DELETE' && oldRecord) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === oldRecord.id
                  ? { ...m, isDeleted: true, content: '[Deleted]' }
                  : m
              )
            );
          }
        } else if (eventType === 'DELETE' && oldRecord) {
          // Handle own message deletions (may come from admin)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === oldRecord.id
                ? { ...m, isDeleted: true, content: '[Deleted]' }
                : m
            )
          );
        }
      });

      setIsSubscribing(false);
    } catch (error) {
      console.error('Failed to subscribe to realtime updates:', error);
      setIsSubscribing(false);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [selectedChannelId, currentUserId]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ channelId, content, replyToId }) => {
      const response = await fetch(`/api/chat/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          replyToId,
        }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      const response = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete message');
    },
    onSuccess: (_, messageId) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, isDeleted: true, content: '[Deleted]' }
            : msg
        )
      );
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }) => {
      const response = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Failed to edit message');
      return response.json();
    },
    onSuccess: (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === updatedMessage.id
            ? { ...msg, content: updatedMessage.content, isEdited: true }
            : msg
        )
      );
    },
  });

  const reportMessageMutation = useMutation({
    mutationFn: async ({ messageId, reason }) => {
      const response = await fetch(`/api/chat/messages/${messageId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error('Failed to report message');
      return response.json();
    },
  });

  const handleSendMessage = useCallback(
    ({ content, replyToId }) => {
      if (!selectedChannelId || !content.trim()) return;

      sendMessageMutation.mutate({
        channelId: selectedChannelId,
        content: content.trim(),
        replyToId,
      });
    },
    [selectedChannelId, sendMessageMutation]
  );

  const handleSelectChannel = useCallback((channelId) => {
    setSelectedChannelId(channelId);
    setMessages([]);
    localMessageIdsRef.current.clear();
  }, []);

  const handleCreateChannel = useCallback(async () => {
    // Placeholder for channel creation
  }, []);

  const handleAttachFile = useCallback(async () => {
    // Placeholder for file attachment
  }, []);

  const selectedChannel = channels.find((ch) => ch.id === selectedChannelId);

  return {
    channels,
    messages: channelMessages,
    selectedChannel,
    selectedChannelId,
    currentUserId,
    isLoading: isLoadingChannels || isLoadingMessages || isSubscribing,
    isSending: sendMessageMutation.isPending,
    error: channelsError || messagesError,

    onSelectChannel: handleSelectChannel,
    onSendMessage: handleSendMessage,
    onCreateChannel: handleCreateChannel,
    onAttachFile: handleAttachFile,
    onDeleteMessage: (messageId) => deleteMessageMutation.mutate(messageId),
    onEditMessage: ({ id, content }) =>
      editMessageMutation.mutate({ messageId: id, content }),
    onReportMessage: ({ id }, reason) =>
      reportMessageMutation.mutate({ messageId: id, reason }),
  };
}
