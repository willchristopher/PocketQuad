'use client'

import React from 'react'
import { Send } from 'lucide-react'

import { useAuth } from '@/lib/auth/context'
import { ApiClientError, apiRequest } from '@/lib/api/client'
import { subscribeToChannel } from '@/lib/supabase/realtime'
import { cn } from '@/lib/utils'

type CampusRoom = {
  id: string
  name: string
  description: string
  unreadCount: number
  memberCount: number
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
  const [room, setRoom] = React.useState<CampusRoom | null>(null)
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [draft, setDraft] = React.useState('')
  const [loadingRoom, setLoadingRoom] = React.useState(true)
  const [loadingMessages, setLoadingMessages] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const reloadTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLocalSendAtRef = React.useRef(0)

  const loadRoom = React.useCallback(async () => {
    setLoadingRoom(true)
    setError(null)

    try {
      const result = await apiRequest<CampusRoom>('/api/channels/campus-room')
      setRoom(result)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to load chatroom'
      setError(message)
    } finally {
      setLoadingRoom(false)
    }
  }, [])

  const loadMessages = React.useCallback(async (channelId: string) => {
    setLoadingMessages(true)
    setError(null)

    try {
      const result = await apiRequest<MessagesResponse>(`/api/channels/${channelId}/messages?limit=80`)
      setMessages(result.items)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to load messages'
      setError(message)
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  const clearScheduledReload = React.useCallback(() => {
    if (!reloadTimerRef.current) return
    clearTimeout(reloadTimerRef.current)
    reloadTimerRef.current = null
  }, [])

  const scheduleMessagesReload = React.useCallback(
    (channelId: string, delayMs = 300) => {
      clearScheduledReload()
      reloadTimerRef.current = setTimeout(() => {
        reloadTimerRef.current = null
        void loadMessages(channelId)
      }, delayMs)
    },
    [clearScheduledReload, loadMessages],
  )

  React.useEffect(() => {
    void loadRoom()
  }, [loadRoom])

  React.useEffect(() => {
    if (!room?.id) {
      setMessages([])
      return
    }

    void loadMessages(room.id)

    const realtime = subscribeToChannel(room.id, (payload) => {
      const nextUserId = (payload as { new?: { user_id?: string } })?.new?.user_id
      if (nextUserId === profile?.id && Date.now() - lastLocalSendAtRef.current < 1200) {
        return
      }
      scheduleMessagesReload(room.id)
    })

    return () => {
      clearScheduledReload()
      void realtime.unsubscribe()
    }
  }, [room?.id, clearScheduledReload, loadMessages, profile?.id, scheduleMessagesReload])

  React.useEffect(
    () => () => {
      clearScheduledReload()
    },
    [clearScheduledReload],
  )

  const sendMessage = async () => {
    const trimmed = draft.trim()
    if (!trimmed || !room?.id || sending) return

    setSending(true)
    setError(null)

    try {
      const created = await apiRequest<ChatMessage>(`/api/channels/${room.id}/messages`, {
        method: 'POST',
        body: {
          content: trimmed,
        },
      })

      lastLocalSendAtRef.current = Date.now()
      setMessages((previous) => [...previous, created])
      setDraft('')
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to send message'
      setError(message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card animate-in-up">
      <section className="flex min-h-[70vh] flex-col">
        <div className="border-b border-border/60 bg-muted/5 px-4 py-3">
          <h1 className="font-display text-lg font-extrabold tracking-tight">
            {room?.name ?? 'Campus Chat'}
          </h1>
          <p className="text-xs text-muted-foreground">
            One shared campus room for respectful, informational, and lighthearted conversation.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            AI moderation removes bullying, violent threats, and inappropriate language.
          </p>
          {room && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {room.memberCount} member{room.memberCount === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {error && (
          <div className="px-4 pt-3">
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto p-4 custom-scrollbar">
          {loadingRoom && <p className="text-xs text-muted-foreground">Loading chatroom...</p>}
          {!loadingRoom && loadingMessages && (
            <p className="text-xs text-muted-foreground">Loading messages...</p>
          )}

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
                <p
                  className={cn(
                    'mt-1 text-sm text-muted-foreground',
                    message.isDeleted && 'italic text-muted-foreground/80',
                  )}
                >
                  {message.content}
                </p>
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
              placeholder="Message Campus Chat"
              className="h-9 flex-1 bg-transparent text-sm outline-none"
              disabled={!room?.id || sending}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!draft.trim() || !room?.id || sending}
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
                draft.trim() && room?.id && !sending
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
  )
}
