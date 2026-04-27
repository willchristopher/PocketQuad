'use client';

import React from 'react';
import { Chatroom } from '@/components/chat/Chatroom';
import { useChatroom } from '@/hooks/useChatroom';
import { useAuth } from '@/lib/auth/context';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

export default function ChatroomPage() {
  const { user } = useAuth();

  const {
    channels,
    messages,
    selectedChannel,
    currentUserId,
    isLoading,
    isSending,
    onSelectChannel,
    onSendMessage,
    onCreateChannel,
    onAttachFile,
    onDeleteMessage,
    onEditMessage,
    onReportMessage,
  } = useChatroom(user?.id);

  if (!user) {
    return <div>Please log in to access the chatroom</div>;
  }

  if (isLoading && !channels.length) {
    return <LoadingSkeleton />;
  }

  return (
    <Chatroom
      channels={channels}
      messages={messages}
      currentUserId={currentUserId}
      isLoading={isLoading}
      isSending={isSending}
      selectedChannel={selectedChannel}
      onSelectChannel={onSelectChannel}
      onSendMessage={onSendMessage}
      onCreateChannel={onCreateChannel}
      onAttachFile={onAttachFile}
      onDeleteMessage={onDeleteMessage}
      onEditMessage={onEditMessage}
      onReportMessage={onReportMessage}
    />
  );
}
