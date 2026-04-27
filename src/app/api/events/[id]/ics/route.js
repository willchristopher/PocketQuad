import { NextResponse } from 'next/server';
import { resolveEventDateRange } from '@/lib/events';
import { prisma } from '@/lib/prisma';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import { canViewEventForAudience } from '@/lib/server/eventVisibility';
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  resolveParams,
} from '@/lib/api/utils';

function escapeIcsText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatUtcTimestamp(date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    'T',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    'Z',
  ].join('');
}

export async function GET(_request, context) {
  try {
    const { profile } = await getAuthenticatedUser();
    const { id } = await resolveParams(context);
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

    const range = resolveEventDateRange(event);
    const details = [event.description, event.externalUrl ? `Details: ${event.externalUrl}` : null]
      .filter(Boolean)
      .join('\n\n');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PocketQuad//Campus Events//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@pocketquad`,
      `DTSTAMP:${formatUtcTimestamp(new Date())}`,
      `DTSTART:${formatUtcTimestamp(range.start)}`,
      `DTEND:${formatUtcTimestamp(range.end)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText(details)}`,
      `LOCATION:${escapeIcsText(event.location)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${event.id}.ics"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
