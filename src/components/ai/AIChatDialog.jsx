'use client';
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
export function AIChatDialog({ open, onOpenChange, messages, input, onInputChange, onSend, isTyping, }) {
    const listRef = React.useRef(null);
    React.useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, isTyping]);
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md overflow-hidden rounded-xl p-0">
        <div className="flex flex-col h-[80vh] bg-card">
          <DialogHeader className="p-4 border-b border-border/60 flex flex-row items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary"/>
              </div>
              <DialogTitle className="text-sm font-bold">AI Campus Assistant</DialogTitle>
            </div>
          </DialogHeader>

          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.map((msg) => (<div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed', msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground')}>
                  {msg.content}
                </div>
              </div>))}
            {isTyping && (<div className="flex justify-start">
                <div className="rounded-xl bg-muted px-3.5 py-2.5 text-sm text-foreground">
                  Typing…
                </div>
              </div>)}
          </div>

          <div className="p-4 border-t border-border/60">
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5">
              <MessageSquare className="w-4 h-4 text-muted-foreground"/>
              <input value={input} onChange={(e) => onInputChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && input.trim() && onSend()} placeholder="Ask about events, faculty, clubs, services..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"/>
              <button onClick={onSend} disabled={!input.trim()} className={cn('inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 transition-colors', input.trim()
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-muted text-muted-foreground')}>
                <Send className="w-4 h-4"/>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>);
}
