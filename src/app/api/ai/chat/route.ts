import { generateText, streamText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { NextRequest } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils'

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

    const groq = createGroq({
      apiKey: process.env.GROQ_API_KEY,
    })

    const systemPrompt =
      'You are MyQuad, a campus advisor assistant. Provide practical guidance about events, faculty, office hours, study planning, and campus resources in concise, accurate language.'

    const stream = request.nextUrl.searchParams.get('stream') !== 'false'

    if (!stream) {
      const result = await generateText({
        model: groq('llama-3.1-8b-instant'),
        system: systemPrompt,
        messages: payload.messages,
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
      messages: payload.messages,
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
    return handleApiError(error)
  }
}
