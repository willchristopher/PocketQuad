'use client'

import * as React from 'react'
import { Sparkles, MessageSquare, Send, X } from 'lucide-react'

import { ApiClientError, apiRequest } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useScrollDirection } from '@/hooks/useScrollDirection'
import { useAuth } from '@/lib/auth/context'
import { AIChatDialog, AIMessage } from './AIChatDialog'

type ChatResponse = {
  conversationId: string
  text: string
}

const MAX_PAYLOAD_MESSAGES = 12

export function AIChatWidget() {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const scrollingDown = useScrollDirection()
  const { profile } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [conversationId, setConversationId] = React.useState<string | undefined>(undefined)
  const [messages, setMessages] = React.useState<AIMessage[]>([])
  const [input, setInput] = React.useState('')
  const [isTyping, setIsTyping] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  // Set a personalized welcome message once profile is available
  const welcomeSet = React.useRef(false)
  React.useEffect(() => {
    if (welcomeSet.current) return
    const name = profile?.displayName?.split(' ')[0] ?? profile?.firstName ?? ''
    const greeting = name ? `Hi ${name}!` : 'Hi there!'
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `${greeting} I'm your MyQuad campus assistant. I have access to your university's events, faculty, services, buildings, clubs, and your personal schedule. What can I help you with?`,
      },
    ])
    if (profile) welcomeSet.current = true
  }, [profile])

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isTyping])

  const sendMessage = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim()
    if (!text || isTyping) return

    const userMsg: AIMessage = { id: `u-${Date.now()}`, role: 'user', content: text }
    const nextMessages = [...messages, userMsg]

    setMessages(nextMessages)
    setInput('')
    setIsTyping(true)
    setError(null)

    try {
      const payloadMessages = nextMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })).slice(-MAX_PAYLOAD_MESSAGES)

      const response = await apiRequest<ChatResponse>('/api/ai/chat?stream=false', {
        method: 'POST',
        body: {
          conversationId,
          messages: payloadMessages,
        },
      })

      setConversationId(response.conversationId)
      setMessages((previous) => [
        ...previous,
        { id: `a-${Date.now()}`, role: 'assistant', content: response.text },
      ])
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to reach AI assistant'
      setError(message)
    } finally {
      setIsTyping(false)
    }
  }

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          style={{ bottom: scrollingDown ? 48 : 80 }}
          className="fixed right-4 z-40 w-12 h-12 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 transition-all duration-300"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="w-5 h-5" />
        </button>
        <AIChatDialog
          open={open}
          onOpenChange={setOpen}
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSend={() => {
            void sendMessage()
          }}
          isTyping={isTyping}
        />
      </>
    )
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        <button
          onClick={() => setOpen(prev => !prev)}
          className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Toggle AI Assistant"
        >
          {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="fixed bottom-20 right-6 z-40 w-[360px] max-w-[90vw] rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-border/60 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">AI Campus Assistant</p>
              <p className="text-[11px] text-muted-foreground">Powered by your university&apos;s live data</p>
            </div>
          </div>

          {error && (
            <div className="px-4 pt-3">
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          )}

          <div ref={listRef} className="max-h-[320px] overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground rounded-2xl px-3.5 py-2.5 text-sm">Typing...</div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border/60">
            <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 px-3.5 py-2.5">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && input.trim()) {
                    void sendMessage()
                  }
                }}
                placeholder="Ask about events, faculty, clubs, services..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
              <button
                onClick={() => {
                  void sendMessage()
                }}
                disabled={!input.trim() || isTyping}
                className={cn(
                  'p-2 rounded-xl transition-all',
                  input.trim() && !isTyping
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
