import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils'

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser()

    const conversations = await prisma.aIConversation.findMany({
      where: { userId: profile.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    })

    return successResponse(conversations)
  } catch (error) {
    return handleApiError(error)
  }
}
