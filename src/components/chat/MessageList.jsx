'use client';

import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { Loader2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MessageList({
  messages = [],
  currentUserId,
  isLoading = false,
  selectedChannel,
  onReplyMessage,
  onReportMessage,
  onDeleteMessage,
  onEditMessage,
}) {
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!selectedChannel) {
    return (
      <Card className="flex flex-col h-full rounded-none border-0">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-muted-foreground">Select a channel to start chatting</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full rounded-none border-0">
      <CardHeader className="border-b px-4 md:px-6 py-4 md:py-6">
        <CardTitle className="flex items-center gap-2">
          <span>#{selectedChannel.name}</span>
        </CardTitle>
        {selectedChannel.description && (
          <p className="text-sm text-muted-foreground font-normal mt-2">
            {selectedChannel.description}
          </p>
        )}
      </CardHeader>

      <div className="flex-1 overflow-y-auto">
        <div ref={scrollRef} className="flex flex-col">
          {isLoading && messages.length === 0 && (
            <div className="flex items-center justify-center h-full py-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
                <p className="text-sm text-muted-foreground">Loading messages...</p>
              </div>
            </div>
          )}

          {!isLoading && messages.length === 0 && (
            <div className="flex items-center justify-center h-full py-8">
              <div className="text-center">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">
                  No messages yet. Start the conversation!
                </p>
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="divide-y">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id || index}
                  message={message}
                  isOwn={message.userId === currentUserId}
                  onReply={() => onReplyMessage?.(message)}
                  onReport={() => onReportMessage?.(message)}
                  onDelete={(id) => onDeleteMessage?.(id)}
                  onEdit={() => onEditMessage?.(message)}
                />
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </Card>
  );
}
