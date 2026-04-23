'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Reply, AlertTriangle, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatMessage({
  message,
  isOwn = false,
  onReply,
  onReport,
  onDelete,
  onEdit,
}) {
  const [isHovered, setIsHovered] = useState(false);

  const initials = message.user?.displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  const [timeDistance, setTimeDistance] = useState('');

  React.useEffect(() => {
    setTimeDistance(
      formatDistanceToNow(new Date(message.createdAt), {
        addSuffix: true,
      })
    );
  }, [message.createdAt]);

  return (
    <div
      className={cn(
        'flex gap-3 px-4 md:px-6 py-2 hover:bg-muted/50 transition-colors',
        'group'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
        <AvatarImage src={message.user?.avatar} alt={message.user?.displayName} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">
            {message.user?.displayName}
          </span>
          <span className="text-xs text-muted-foreground" suppressHydrationWarning>
            {timeDistance}
          </span>
          {message.isEdited && (
            <span className="text-xs text-muted-foreground italic">(edited)</span>
          )}
        </div>

        {message.replyTo && (
          <div className="mt-1 mb-2 pl-3 border-l-2 border-muted-foreground/30 py-1 text-sm">
            <p className="text-xs font-medium text-muted-foreground">
              {message.replyTo.user?.displayName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {message.replyTo.content}
            </p>
          </div>
        )}

        {!message.isDeleted ? (
          <p className="text-sm text-foreground mt-1 break-words whitespace-pre-wrap">
            {message.content}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic mt-1">
            This message has been deleted
          </p>
        )}
      </div>

      {(isHovered || isOwn) && !message.isDeleted && (
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onReply?.(message)}>
                <Reply className="h-4 w-4 mr-2" />
                Reply
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(message.content);
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Message
              </DropdownMenuItem>

              {isOwn && (
                <>
                  <DropdownMenuItem onClick={() => onEdit?.(message)}>
                    Edit
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => onDelete?.(message.id)}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}

              {!isOwn && (
                <DropdownMenuItem
                  onClick={() => onReport?.(message)}
                  className="text-destructive"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Report
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
