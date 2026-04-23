'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function MessageComposer({
  isLoading = false,
  disabled = false,
  onSendMessage,
  onAttachFile,
  placeholder = 'Type a message... (Shift+Enter for new line)',
}) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage?.(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = message.trim().length > 0 && !isLoading && !disabled;

  return (
    <div className="border-t bg-card p-4 md:p-6">
      <div className="space-y-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isLoading}
              className={cn(
                'resize-none min-h-12 max-h-48 py-2 px-3',
                'rounded-lg border border-input',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={onAttachFile}
              disabled={disabled || isLoading}
              title="Attach file"
              className="hover:bg-accent"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Button
              size="icon"
              onClick={handleSend}
              disabled={!canSend}
              title={canSend ? 'Send message' : 'Type a message to send'}
              className={cn(
                'transition-colors',
                canSend
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <div className="animate-spin">
                  <PlusCircle className="h-5 w-5" />
                </div>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            {message.length > 0 && (
              <>
                {message.length} character{message.length !== 1 ? 's' : ''}
              </>
            )}
          </span>
          <span>Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
}
