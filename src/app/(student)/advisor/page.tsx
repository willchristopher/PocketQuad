'use client'

import React from 'react'
import { Bot, Send, Sparkles } from 'lucide-react'

import { ApiClientError, apiRequest } from '@/lib/api/client'
import { cn } from '@/lib/utils'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type ChatResponse = {
  conversationId: string
  text: string
}

const MAX_PAYLOAD_MESSAGES = 12

const starterPrompts = [
  'What events are happening this week?',
  'Show me upcoming deadlines I should prioritize.',
  'How should I plan study time around campus events?',
]

export default function AdvisorPage() {
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [conversationId, setConversationId] = React.useState<string | undefined>(undefined)
  const [error, setError] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 'assistant-0',
      role: 'assistant',
      content: 'I am your PocketQuad AI advisor. Ask about events, deadlines, office hours, or campus resources.',
    },
  ])

  const listRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (prefill?: string) => {
    const prompt = (prefill ?? input).trim()
    if (!prompt || loading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
    }

    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const payloadMessages = nextMessages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .map((message) => ({
          role: message.role,
          content: message.content,
        }))
        .slice(-MAX_PAYLOAD_MESSAGES)

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
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.text,
        },
      ])
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to fetch AI response'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 md:p-7 animate-in-up">
        <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">AI Advisor</h1>
            <p className="text-sm text-muted-foreground">
              Natural-language support for campus resources, faculty availability, events, and study planning.
            </p>
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap gap-2">
          {starterPrompts.map((prompt, index) => (
            <button
              key={prompt}
              onClick={() => void send(prompt)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/15 px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:bg-muted/35 animate-in-up"
              style={{ animationDelay: `${0.03 * (index + 1)}s` }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {prompt}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card animate-in-up stagger-1">
        <div ref={listRef} className="max-h-[55vh] space-y-3 overflow-y-auto p-4 custom-scrollbar">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn('flex animate-in-up', message.role === 'user' ? 'justify-end' : 'justify-start')}
              style={{ animationDelay: `${0.02 * index}s` }}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-in-up">
              <div className="rounded-2xl bg-muted px-3.5 py-2.5 text-sm text-foreground">Thinking...</div>
            </div>
          )}
        </div>

        <div className="border-t border-border/60 p-3 md:p-4">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 transition-colors focus-within:border-primary/40 focus-within:bg-muted/35">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void send()
                }
              }}
              placeholder="Ask the advisor..."
              className="h-9 flex-1 bg-transparent text-sm outline-none"
              disabled={loading}
            />
            <button
              onClick={() => void send()}
              disabled={!input.trim() || loading}
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
                input.trim() && !loading ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground',
              )}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
