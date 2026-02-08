'use client'

import React from 'react'
import { Hash, Send } from 'lucide-react'

import { useAuth } from '@/lib/auth/context'
import { ApiClientError, apiRequest } from '@/lib/api/client'
import { subscribeToChannel } from '@/lib/supabase/realtime'
import { cn } from '@/lib/utils'

type Channel = {
  id: string
  name: string
  unreadCount: number
}

type ChatMessage = {
  id: string
  content: string
  isDeleted: boolean
  createdAt: string
  user: {
    id: string
    displayName: string
    avatar: string | null
  }
}

type MessagesResponse = {
  items: ChatMessage[]
  nextCursor: string | null
  hasMore: boolean
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function ChatroomPage() {
  const { profile } = useAuth()
  const [channels, setChannels] = React.useState<Channel[]>([])
  const [activeChannelId, setActiveChannelId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [draft, setDraft] = React.useState('')
  const [loadingChannels, setLoadingChannels] = React.useState(true)
  const [loadingMessages, setLoadingMessages] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadChannels = React.useCallback(async () => {
    setLoadingChannels(true)
    setError(null)

    try {
      const result = await apiRequest<Channel[]>('/api/channels?limit=100')
      setChannels(result)

      if (result.length > 0) {
        setActiveChannelId((prev) => prev ?? result[0].id)
      }
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to load channels'
      setError(message)
    } finally {
      setLoadingChannels(false)
    }
  }, [])

  const loadMessages = React.useCallback(async (channelId: string) => {
    setLoadingMessages(true)
    setError(null)

    try {
      const result = await apiRequest<MessagesResponse>(`/api/channels/${channelId}/messages?limit=60`)
      setMessages(result.items)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to load messages'
      setError(message)
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  React.useEffect(() => {
    void loadChannels()
  }, [loadChannels])

  React.useEffect(() => {
    if (!activeChannelId) {
      setMessages([])
      return
    }

    void loadMessages(activeChannelId)

    const realtime = subscribeToChannel(activeChannelId, () => {
      void loadMessages(activeChannelId)
    })

    return () => {
      void realtime.unsubscribe()
    }
  }, [activeChannelId, loadMessages])

  const createDefaultChannel = async () => {
    setError(null)
    try {
      const created = await apiRequest<Channel>('/api/channels', {
        method: 'POST',
        body: {
          name: 'General',
          description: 'Campus-wide updates and conversation',
          type: 'PUBLIC',
        },
      })

      setChannels([created])
      setActiveChannelId(created.id)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to create channel'
      setError(message)
    }
  }

  const sendMessage = async () => {
    const trimmed = draft.trim()
    if (!trimmed || !activeChannelId || sending) return

    setSending(true)
    setError(null)

    try {
      const created = await apiRequest<ChatMessage>(`/api/channels/${activeChannelId}/messages`, {
        method: 'POST',
        body: {
          content: trimmed,
        },
      })

      setMessages((previous) => [...previous, created])
      setDraft('')
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to send message'
      setError(message)
    } finally {
      setSending(false)
    }
  }

  const activeChannel = channels.find((channel) => channel.id === activeChannelId)

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card animate-in-up">
      <div className="grid min-h-[70vh] md:grid-cols-[240px_1fr]">
        <aside className="border-b border-border/60 bg-muted/10 p-3 md:border-b-0 md:border-r md:p-4">
          <h1 className="mb-3 font-display text-lg font-extrabold tracking-tight">Student Chatroom</h1>

          {loadingChannels && <p className="text-xs text-muted-foreground">Loading channels...</p>}

          {!loadingChannels && channels.length === 0 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">You are not in any channels yet.</p>
              <button
                onClick={() => void createDefaultChannel()}
                className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              >
                Create General Channel
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            {channels.map((channel, index) => (
              <button
                key={channel.id}
                onClick={() => setActiveChannelId(channel.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 animate-in-up',
                  activeChannelId === channel.id
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                )}
                style={{ animationDelay: `${0.03 * (index + 1)}s` }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Hash className="h-4 w-4" />
                  {channel.name.toLowerCase()}
                </span>
                {channel.unreadCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {channel.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[55vh] flex-col">
          <div className="border-b border-border/60 bg-muted/5 px-4 py-3">
            <h2 className="text-sm font-semibold">#{activeChannel?.name.toLowerCase() ?? 'channel'}</h2>
            <p className="text-xs text-muted-foreground">Discuss events, updates, and campus resources in real time.</p>
          </div>

          {error && (
            <div className="px-4 pt-3">
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto p-4 custom-scrollbar">
            {loadingMessages && <p className="text-xs text-muted-foreground">Loading messages...</p>}

            {!loadingMessages && messages.length === 0 && (
              <p className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                No messages yet. Start the conversation.
              </p>
            )}

            {messages.map((message, index) => {
              const isOwn = message.user.id === profile?.id

              return (
                <div
                  key={message.id}
                  className={cn(
                    'rounded-xl border p-3 hover-lift animate-in-up',
                    isOwn ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/10',
                  )}
                  style={{ animationDelay: `${0.02 * (index + 1)}s` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{isOwn ? 'You' : message.user.displayName}</p>
                    <p className="text-[11px] text-muted-foreground">{formatTime(message.createdAt)}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{message.isDeleted ? '[deleted]' : message.content}</p>
                </div>
              )
            })}
          </div>

          <div className="border-t border-border/60 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 transition-colors focus-within:border-primary/40 focus-within:bg-muted/35">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void sendMessage()
                  }
                }}
                placeholder={`Message #${activeChannel?.name.toLowerCase() ?? 'channel'}`}
                className="h-9 flex-1 bg-transparent text-sm outline-none"
                disabled={!activeChannelId || sending}
              />
              <button
                onClick={() => void sendMessage()}
                disabled={!draft.trim() || !activeChannelId || sending}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
                  draft.trim() && activeChannelId && !sending
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'bg-muted text-muted-foreground',
                )}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
