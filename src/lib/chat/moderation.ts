import { createGroq } from '@ai-sdk/groq'
import { generateObject } from 'ai'
import { z } from 'zod'

const moderationSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().trim().min(1).max(220),
})

const hardBlockPattern =
  /\b(fuck|fucking|shit|bitch|asshole|dick|pussy|cunt|slut|whore|motherfucker|bullshit)\b/i

const SAFETY_SYSTEM_PROMPT = `You are a strict campus chat moderator.

Allow only messages that are respectful, informational, or lighthearted.
Block messages containing:
- Vulgar or explicit sexual language
- Harassment, bullying, insults, or demeaning remarks
- Hate speech or discriminatory language
- Threats, violence, or encouragement of harm

Return a JSON object with:
- allowed: boolean
- reason: short user-facing reason (no more than 20 words)

If uncertain, choose safer behavior.`

export type ChatModerationResult = {
  allowed: boolean
  reason: string
}

export async function moderateCampusChatMessage(content: string): Promise<ChatModerationResult> {
  const trimmed = content.trim()
  if (trimmed.length === 0) {
    return {
      allowed: false,
      reason: 'Message cannot be empty.',
    }
  }

  if (hardBlockPattern.test(trimmed)) {
    return {
      allowed: false,
      reason: 'Please keep messages respectful and free of vulgar language.',
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

