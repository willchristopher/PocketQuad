import { generateText, streamText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'
import { buildAIContextQueryPlan, gatherUniversityContext } from '@/lib/ai/context'

const chatSchema = z.object({
  conversationId: z.string().cuid().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().min(1),
      }),
    )
    .min(1),
})

function buildSystemPrompt(universityContext: string, userInfo: { name: string; role: string }): string {
  return `You are PocketQuad, a knowledgeable campus advisor AI assistant for ${userInfo.name} (role: ${userInfo.role}).

TODAY'S DATE: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

CORE RULES:
- ONLY provide information from the university data below. Do NOT fabricate events, faculty, buildings, clubs, services, or links.
- If the user asks about something not in the data, say you don't have that information and suggest they check with their university.
- Be concise, friendly, and accurate. Use bullet points for lists.
- When mentioning events include date, time, and location. When mentioning faculty include their office and hours.
- If asked about a different university, explain you can only provide information for the user's own university.
- For personal schedule questions, use the "YOUR UPCOMING DEADLINES" and "YOUR UPCOMING CALENDAR" sections.

UNIVERSITY DATA:
${universityContext}`
}

const MAX_CHAT_HISTORY_MESSAGES = 12
const MAX_CHAT_HISTORY_CHARS = 6_000

type ChatRole = 'system' | 'user' | 'assistant'
type ChatMessage = { role: ChatRole; content: string }

function trimChatHistory(messages: ChatMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  const filtered = messages.filter(
    (message): message is { role: 'user' | 'assistant'; content: string } =>
      message.role === 'user' || message.role === 'assistant',
  )

  const recent = filtered.slice(-MAX_CHAT_HISTORY_MESSAGES)
  const selected: Array<{ role: 'user' | 'assistant'; content: string }> = []

  let totalChars = 0

  for (let index = recent.length - 1; index >= 0; index -= 1) {
    const message = recent[index]
    const nextTotalChars = totalChars + message.content.length

    if (selected.length >= 4 && nextTotalChars > MAX_CHAT_HISTORY_CHARS) {
      continue
    }

    selected.push(message)
    totalChars = nextTotalChars
  }

  return selected.reverse()
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new ApiError(500, 'GROQ_API_KEY is not configured')
    }

    const { profile } = await getAuthenticatedUser()
    const payload = chatSchema.parse(await request.json())

    const latestUserMessage = [...payload.messages].reverse().find((message) => message.role === 'user')

    if (!latestUserMessage) {
      throw new ApiError(400, 'At least one user message is required')
    }

    let conversation

    if (payload.conversationId) {
      conversation = await prisma.aIConversation.findFirst({
        where: {
          id: payload.conversationId,
          userId: profile.id,
        },
      })
    }

    if (!conversation) {
      conversation = await prisma.aIConversation.create({
        data: {
          userId: profile.id,
          title: latestUserMessage.content.slice(0, 80),
        },
      })
    }

    await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        userId: profile.id,
        role: 'user',
        content: latestUserMessage.content,
      },
    })

    const contextPlan = buildAIContextQueryPlan(latestUserMessage.content)

    // Gather scoped university context from DB
    const universityContext = await gatherUniversityContext(
      profile.universityId,
      profile.id,
      contextPlan,
    )

    const systemPrompt = buildSystemPrompt(universityContext, {
      name: profile.displayName || profile.firstName,
      role: profile.role,
    })

    const groq = createGroq({
      apiKey: process.env.GROQ_API_KEY,
    })

    // Keep only a compact history window; long threads otherwise add
    // avoidable latency and token cost on every turn.
    const chatMessages = trimChatHistory(payload.messages)

    const stream = request.nextUrl.searchParams.get('stream') !== 'false'

    if (!stream) {
      const result = await generateText({
        model: groq('llama-3.1-8b-instant'),
        system: systemPrompt,
        messages: chatMessages,
      })

      await prisma.$transaction([
        prisma.aIMessage.create({
          data: {
            conversationId: conversation.id,
            role: 'assistant',
            content: result.text,
          },
        }),
        prisma.aIConversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        }),
      ])

      return successResponse({
        conversationId: conversation.id,
        text: result.text,
      })
    }

    const result = streamText({
      model: groq('llama-3.1-8b-instant'),
      system: systemPrompt,
      messages: chatMessages,
      onFinish: async ({ text }: { text: string }) => {
        await prisma.$transaction([
          prisma.aIMessage.create({
            data: {
              conversationId: conversation.id,
              role: 'assistant',
              content: text,
            },
          }),
          prisma.aIConversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          }),
        ])
      },
    })

    return result.toTextStreamResponse({
      headers: {
        'x-conversation-id': conversation.id,
      },
    })
  } catch (error) {
    // Surface AI SDK / Groq errors as readable messages instead of generic 500
    if (error instanceof ApiError) {
      return handleApiError(error)
    }

    if (error instanceof Error) {
      const msg = error.message ?? 'Unknown AI error'

      // Rate-limit or token-limit errors from Groq
      if (msg.includes('rate') || msg.includes('limit') || msg.includes('429')) {
        return NextResponse.json(
          { error: 'The AI service is temporarily rate-limited. Please wait a moment and try again.' },
          { status: 429 },
        )
      }

      // Model not found / bad request
      if (msg.includes('model') || msg.includes('400')) {
        return NextResponse.json(
          { error: 'AI model configuration error. Please contact an administrator.' },
          { status: 502 },
        )
      }

      console.error('[ai/chat] Error:', msg)
    }

    return handleApiError(error)
  }
}
