'use client';

import React, { useState } from 'react';
import { Plus, Hash, Lock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function ChannelList({
  channels = [],
  selectedChannelId,
  onSelectChannel,
  onCreateChannel,
}) {
  const getChannelIcon = (type) => {
    switch (type) {
      case 'PRIVATE':
        return <Lock className="h-4 w-4" />;
      case 'DIRECT':
        return <MessageCircle className="h-4 w-4" />;
      case 'PUBLIC':
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  return (
    <Card className="flex flex-col h-full border-r rounded-none">
      <div className="border-b p-4 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Channels</h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCreateChannel}
            title="Create new channel"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {channels.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  selectedChannelId === channel.id
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span className="flex-shrink-0">
                  {getChannelIcon(channel.type)}
                </span>
                <div className="flex-1 min-w-0 text-left">
                  <p className="truncate">{channel.name}</p>
                  {channel.description && (
                    <p className="truncate text-xs opacity-70">
                      {channel.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <div>
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">
              No channels available
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={onCreateChannel}
              className="mt-2"
            >
              Create Channel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
