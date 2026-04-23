'use client';

import React, { useState, useCallback } from 'react';
import { ChannelList } from '@/components/chat/ChannelList';
import { MessageList } from '@/components/chat/MessageList';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { cn } from '@/lib/utils';

export function Chatroom({
  channels = [],
  messages = [],
  currentUserId,
  isLoading = false,
  isSending = false,
  onSelectChannel,
  onSendMessage,
  onCreateChannel,
  onAttachFile,
  onDeleteMessage,
  onEditMessage,
  onReportMessage,
  selectedChannel,
}) {
  const [replyingToMessage, setReplyingToMessage] = useState(null);

  const handleSendMessage = useCallback(
    (content) => {
      const payload = {
        content,
        replyToId: replyingToMessage?.id,
      };
      onSendMessage?.(payload);
      setReplyingToMessage(null);
    },
    [onSendMessage, replyingToMessage]
  );

  const handleReplyMessage = useCallback((message) => {
    setReplyingToMessage(message);
  }, []);

  return (
    <div className={cn('h-screen flex bg-background')}>
      <aside className="hidden lg:flex lg:w-64 xl:w-72 flex-col border-r bg-card">
        <ChannelList
          channels={channels}
          selectedChannelId={selectedChannel?.id}
          onSelectChannel={onSelectChannel}
          onCreateChannel={onCreateChannel}
        />
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          isLoading={isLoading}
          selectedChannel={selectedChannel}
          onReplyMessage={handleReplyMessage}
          onReportMessage={onReportMessage}
          onDeleteMessage={onDeleteMessage}
          onEditMessage={onEditMessage}
        />

        {replyingToMessage && (
          <div className="px-4 md:px-6 py-2 bg-muted border-t flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Replying to {replyingToMessage.user?.displayName}
              </p>
              <p className="text-sm text-foreground truncate">
                {replyingToMessage.content}
              </p>
            </div>
            <button
              onClick={() => setReplyingToMessage(null)}
              className="ml-2 text-muted-foreground hover:text-foreground text-xs"
            >
              Cancel
            </button>
          </div>
        )}

        <MessageComposer
          isLoading={isSending}
          disabled={!selectedChannel || isLoading}
          onSendMessage={handleSendMessage}
          onAttachFile={onAttachFile}
          placeholder={
            selectedChannel
              ? `Message #${selectedChannel.name}...`
              : 'Select a channel to message'
          }
        />
      </main>
    </div>
  );
}
