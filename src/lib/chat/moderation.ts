import crypto from 'node:crypto'

import { createGroq } from '@ai-sdk/groq'
import { generateObject } from 'ai'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'

const moderationSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().trim().min(1).max(220),
})

const hardBlockPattern =
  /\b(fuck|fucking|shit|bitch|asshole|dick|pussy|cunt|slut|whore|motherfucker|bullshit)\b/i
const hardThreatPattern =
  /\b(kill yourself|go die|i(?:'|’)ll kill you|i will kill you|beat you up|shoot you|stab you|i'm going to hurt you)\b/i
const AUTO_REMOVED_MESSAGE = '[removed by AI moderation]'
const SCAN_WINDOW_MS = 1000 * 60 * 60 * 24
const SCAN_BATCH_SIZE = 20
const CACHE_TTL_MS = 1000 * 60 * 10
const REPORT_AUTO_REMOVE_THRESHOLD = 3

type ModerationCacheEntry = {
  hash: string
  checkedAt: number
  result: ChatModerationResult
}

type GlobalModerationCache = typeof globalThis & {
  __pocketquadModerationCache?: Map<string, ModerationCacheEntry>
}

const SAFETY_SYSTEM_PROMPT = `You are an AI moderator for a campus chatroom.

Allow normal student conversation, including:
- Informational campus talk
- Friendly jokes, memes, and lighthearted banter
- Casual everyday conversation
- Safety or news discussion about difficult topics when it is clearly informational and not threatening

Return a JSON object with:
- allowed: boolean
- reason: short user-facing reason (no more than 20 words)

Disallow messages containing:
- Inappropriate or vulgar language
- Sexual content
- Harassment, bullying, insults, intimidation, or personal attacks
- Violent threats, violent fantasies, or encouragement of harm
- Hate speech or discriminatory language

Do not over-moderate harmless fun or regular conversation.
If uncertain, prefer safety only when the message appears hostile, abusive, or threatening.`

export type ChatModerationResult = {
  allowed: boolean
  reason: string
}

function getModerationCache() {
  const globalCache = globalThis as GlobalModerationCache
  globalCache.__pocketquadModerationCache ??= new Map<string, ModerationCacheEntry>()
  return globalCache.__pocketquadModerationCache
}

function hashMessage(content: string) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

function getCachedModerationResult(messageId: string, content: string) {
  const cache = getModerationCache()
  const entry = cache.get(messageId)
  const now = Date.now()

  if (!entry) {
    return null
  }

  if (entry.checkedAt + CACHE_TTL_MS <= now || entry.hash !== hashMessage(content)) {
    cache.delete(messageId)
    return null
  }

  return entry.result
}

function setCachedModerationResult(messageId: string, content: string, result: ChatModerationResult) {
  const cache = getModerationCache()
  cache.set(messageId, {
    hash: hashMessage(content),
    checkedAt: Date.now(),
    result,
  })
}

function clearCachedModerationResult(messageId: string) {
  getModerationCache().delete(messageId)
}

async function runAiModeration(trimmed: string): Promise<ChatModerationResult> {
  if (trimmed.length === 0) {
    return {
      allowed: false,
      reason: 'Message cannot be empty.',
    }
  }

  if (hardBlockPattern.test(trimmed)) {
    return {
      allowed: false,
      reason: 'Please avoid inappropriate or vulgar language in chat.',
    }
  }

  if (hardThreatPattern.test(trimmed)) {
    return {
      allowed: false,
      reason: 'Threatening or violent language is not allowed here.',
    }
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return {
      allowed: true,
      reason: 'Allowed by fallback moderation.',
    }
  }

  try {
    const groq = createGroq({ apiKey })

    const { object } = await generateObject({
      model: groq('llama-3.1-8b-instant'),
      schema: moderationSchema,
      system: SAFETY_SYSTEM_PROMPT,
      prompt: `Moderate this campus chat message:\n\n"${trimmed}"`,
      temperature: 0,
    })

    return {
      allowed: object.allowed,
      reason: object.reason,
    }
  } catch {
    return {
      allowed: true,
      reason: 'Allowed by fallback moderation.',
    }
  }
}

export async function moderateCampusChatMessage(content: string): Promise<ChatModerationResult> {
  const trimmed = content.trim()
  return runAiModeration(trimmed)
}

export async function scanChannelMessagesForModeration(channelId: string) {
  const recentMessages = await prisma.chatMessage.findMany({
    where: {
      channelId,
      isDeleted: false,
      createdAt: {
        gte: new Date(Date.now() - SCAN_WINDOW_MS),
      },
    },
    orderBy: { createdAt: 'desc' },
    take: SCAN_BATCH_SIZE,
    select: {
      id: true,
      content: true,
    },
  })

  const removedMessageIds: string[] = []

  for (const message of recentMessages) {
    const cached = getCachedModerationResult(message.id, message.content)
    const moderation = cached ?? (await moderateCampusChatMessage(message.content))

    if (!cached) {
      setCachedModerationResult(message.id, message.content, moderation)
    }

    if (moderation.allowed) {
      continue
    }

    const removal = await prisma.chatMessage.updateMany({
      where: {
        id: message.id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        isEdited: true,
        content: AUTO_REMOVED_MESSAGE,
      },
    })

    if (removal.count > 0) {
      removedMessageIds.push(message.id)
    }
  }

  return {
    removedMessageIds,
  }
}

export async function reviewReportedMessage(messageId: string) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      content: true,
      isDeleted: true,
      _count: {
        select: {
          reports: true,
        },
      },
    },
  })

  if (!message || message.isDeleted) {
    return {
      removed: false,
      reason: 'Message already removed or not found.',
      reportCount: message?._count.reports ?? 0,
    }
  }

  clearCachedModerationResult(message.id)
  const moderation = await moderateCampusChatMessage(message.content)

  const shouldRemove = !moderation.allowed || message._count.reports >= REPORT_AUTO_REMOVE_THRESHOLD

  if (!shouldRemove) {
    setCachedModerationResult(message.id, message.content, moderation)
    return {
      removed: false,
      reason: moderation.reason,
      reportCount: message._count.reports,
    }
  }

  const removal = await prisma.chatMessage.updateMany({
    where: {
      id: message.id,
      isDeleted: false,
    },
    data: {
      isDeleted: true,
      isEdited: true,
      content: AUTO_REMOVED_MESSAGE,
    },
  })

  return {
    removed: removal.count > 0,
    reason: moderation.reason,
    reportCount: message._count.reports,
  }
}
