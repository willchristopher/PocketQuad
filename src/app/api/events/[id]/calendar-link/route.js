import { z } from 'zod';
import { buildExternalCalendarUrl } from '@/lib/events';
import { prisma } from '@/lib/prisma';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import { canViewEventForAudience } from '@/lib/server/eventVisibility';
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  resolveParams,
  successResponse,
} from '@/lib/api/utils';

const providerSchema = z.object({
  provider: z.enum(['GOOGLE', 'OUTLOOK', 'APPLE']),
});

export async function POST(request, context) {
  try {
    const { profile } = await getAuthenticatedUser();
    const { id } = await resolveParams(context);
    const { provider } = providerSchema.parse(await request.json());

    let event;
    try {
      event = await prisma.event.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          endDate: true,
          time: true,
          location: true,
          externalUrl: true,
          audience: true,
          organizerId: true,
          isPublished: true,
          isCancelled: true,
          organizerRef: {
            select: {
              facultyProfile: {
                select: {
                  favorites: {
                    where: { userId: profile.id },
                    select: { userId: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });
    } catch (error) {
      if (!isPrismaSchemaCompatibilityError(error)) {
        throw error;
      }
      event = await prisma.event.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          endDate: true,
          time: true,
          location: true,
          audience: true,
          organizerId: true,
          isPublished: true,
          isCancelled: true,
          organizerRef: {
            select: {
              facultyProfile: {
                select: {
                  favorites: {
                    where: { userId: profile.id },
                    select: { userId: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });
    }
    if (!event || !event.isPublished || event.isCancelled) {
      throw new ApiError(404, 'Event not found');
    }
    if (!canViewEventForAudience(profile, event)) {
      throw new ApiError(404, 'Event not found');
    }

    try {
      await prisma.eventCalendarExport.upsert({
        where: {
          userId_eventId_provider: {
            userId: profile.id,
            eventId: id,
            provider,
          },
        },
        create: {
          userId: profile.id,
          eventId: id,
          provider,
        },
        update: {},
      });
    } catch (error) {
      if (!isPrismaSchemaCompatibilityError(error)) {
        throw error;
      }
    }

    if (provider === 'APPLE') {
      return successResponse({
        provider,
        url: `/api/events/${id}/ics`,
      });
    }

    const url = buildExternalCalendarUrl(event, provider);
    if (!url) {
      throw new ApiError(400, 'Unable to build the requested calendar link.');
    }

    return successResponse({
      provider,
      url,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
