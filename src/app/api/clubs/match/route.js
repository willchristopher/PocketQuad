import { createGroq } from '@ai-sdk/groq';
import { generateObject } from 'ai';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils';
import { getClubsCached } from '@/lib/server/universityData';

const CLUB_MATCH_SCHEMA = z.object({
  overview: z.string().trim().min(1).max(220),
  cards: z.array(
    z.object({
      clubId: z.string().trim().min(1),
      hook: z.string().trim().min(1).max(60),
      reason: z.string().trim().min(1).max(160),
    }),
  ).min(1).max(10),
});

const STOP_WORDS = new Set([
  'about',
  'already',
  'and',
  'around',
  'campus',
  'class',
  'clubs',
  'club',
  'date',
  'event',
  'events',
  'fall',
  'for',
  'from',
  'have',
  'interest',
  'interests',
  'into',
  'just',
  'like',
  'look',
  'looking',
  'more',
  'murray',
  'next',
  'ones',
  'or',
  'spring',
  'state',
  'student',
  'students',
  'that',
  'the',
  'their',
  'them',
  'they',
  'this',
  'through',
  'upcoming',
  'with',
  'your',
]);

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractInterestTokens(values) {
  return uniqueStrings(
    values
      .flatMap((value) => normalizeText(value).split(' '))
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
  ).slice(0, 30);
}

function scoreClubForMatch({ club, interestTokens, followedCategories }) {
  const category = club.category?.trim() || 'General';
  const haystack = normalizeText([
    club.name,
    category,
    club.description,
    club.meetingInfo,
    club.contactEmail,
  ].filter(Boolean).join(' '));

  const matchedTokens = interestTokens.filter((token) => haystack.includes(token)).slice(0, 3);

  let score = 38;

  if (matchedTokens.length > 0) {
    score += matchedTokens.length * 12;
  }

  if (followedCategories.has(category)) {
    score += 12;
  } else if (followedCategories.size > 0) {
    score += 6;
  }

  if (club.meetingInfo) {
    score += 5;
  }

  if (club.websiteUrl) {
    score += 4;
  }

  if (club.contactEmail) {
    score += 3;
  }

  const hook = matchedTokens.length > 0
    ? 'Matches your current campus rhythm'
    : followedCategories.has(category)
      ? 'Build on a club lane you already like'
      : 'Try a new lane on campus';

  const reason = matchedTokens.length > 0
    ? `This club lines up with ${matchedTokens[0]} and the activity already showing up in your PocketQuad context.`
    : followedCategories.has(category)
      ? `This club sits in a category you already follow, so it could deepen the network you are building.`
      : `This club gives you a new organization lane to explore while still fitting the interests you have marked so far.`;

  return {
    clubId: club.id,
    hook,
    reason,
    score,
  };
}

function buildFallbackClubMatch({ clubs, followedClubs, calendarEntries, profile }) {
  const followedCategories = new Set(
    followedClubs.map((club) => club.category?.trim()).filter(Boolean),
  );

  const interestTokens = extractInterestTokens([
    profile.major,
    profile.department,
    profile.year,
    ...followedClubs.flatMap((club) => [club.name, club.category]),
    ...calendarEntries.flatMap((entry) => [entry.title, entry.description, entry.location, entry.type]),
  ]);

  const cards = clubs
    .map((club) => scoreClubForMatch({ club, interestTokens, followedCategories }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 10)
    .map(({ score, ...card }) => card);

  return {
    overview:
      cards.length > 0
        ? 'Club Match is blending your saved interests with your upcoming PocketQuad calendar to surface clubs worth a closer look.'
        : 'No fresh Club Match suggestions are available right now, but new clubs will appear here as the directory grows.',
    cards,
  };
}

async function generateClubMatchWithAi({ clubs, followedClubs, calendarEntries, profile }) {
  if (!process.env.GROQ_API_KEY || clubs.length === 0) {
    return null;
  }

  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  const candidateLines = clubs
    .slice(0, 24)
    .map((club) => [
      `id=${club.id}`,
      `name=${club.name}`,
      `category=${club.category}`,
      `meetingInfo=${club.meetingInfo ?? 'Not listed'}`,
      `website=${club.websiteUrl ?? 'Not listed'}`,
      `description=${club.description}`,
    ].join(' | '))
    .join('\n');

  const calendarLines = calendarEntries
    .slice(0, 12)
    .map((entry) => [
      entry.title,
      entry.type,
      entry.location ?? 'Location not listed',
      `${new Date(entry.start).toISOString()} -> ${new Date(entry.end).toISOString()}`,
    ].join(' | '))
    .join('\n');

  try {
    const { object } = await generateObject({
      model: groq('llama-3.1-8b-instant'),
      schema: CLUB_MATCH_SCHEMA,
      temperature: 0.35,
      prompt: `Recommend new student clubs for this Murray State University student.

Student profile:
- major: ${profile.major ?? 'Unknown'}
- department: ${profile.department ?? 'Unknown'}
- year: ${profile.year ?? 'Unknown'}
- saved club interests: ${followedClubs.map((club) => `${club.name} (${club.category})`).join(', ') || 'None'}

PocketQuad calendar context:
${calendarLines || 'No upcoming PocketQuad calendar items'}

Candidate clubs:
${candidateLines}

Rules:
- Recommend only clubs from the candidate list.
- These should be new clubs, not the ones the student already follows.
- Use the saved club interests and PocketQuad calendar context to estimate fit.
- Prefer plain, direct language.
- Keep hooks short and reasons specific.
- Only reference club IDs that appear in the candidate list.`,
    });

    return object;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser({
      includePreferences: true,
    });

    const followedClubIds = profile.notificationPreferences?.clubInterestIds ?? [];

    const [clubs, followedClubs, calendarEntries] = await Promise.all([
      getClubsCached(profile.universityId ?? undefined, undefined, undefined),
      followedClubIds.length > 0
        ? prisma.clubOrganization.findMany({
            where: {
              id: { in: followedClubIds },
              universityId: profile.universityId ?? undefined,
            },
            select: {
              id: true,
              name: true,
              category: true,
            },
          })
        : Promise.resolve([]),
      prisma.calendarEvent.findMany({
        where: {
          userId: profile.id,
          end: { gte: new Date() },
        },
        select: {
          id: true,
          title: true,
          description: true,
          location: true,
          type: true,
          start: true,
          end: true,
        },
        orderBy: { start: 'asc' },
        take: 16,
      }),
    ]);

    const candidateClubs = clubs.filter((club) => !followedClubIds.includes(club.id));

    if (candidateClubs.length === 0) {
      return successResponse({
        overview: 'You have already worked through every club currently loaded into Clubhouse.',
        cards: [],
      });
    }

    const fallback = buildFallbackClubMatch({
      clubs: candidateClubs,
      followedClubs,
      calendarEntries,
      profile,
    });

    const aiResult =
      (await generateClubMatchWithAi({
        clubs: candidateClubs,
        followedClubs,
        calendarEntries,
        profile,
      })) ?? fallback;

    const clubById = new Map(candidateClubs.map((club) => [club.id, club]));
    const cards = aiResult.cards
      .map((card) => {
        const club = clubById.get(card.clubId);

        if (!club) {
          return null;
        }

        return {
          ...card,
          club,
        };
      })
      .filter(Boolean);

    if (cards.length === 0) {
      return successResponse({
        overview: fallback.overview,
        cards: fallback.cards
          .map((card) => {
            const club = clubById.get(card.clubId);

            if (!club) {
              return null;
            }

            return {
              ...card,
              club,
            };
          })
          .filter(Boolean),
      });
    }

    return successResponse({
      overview: aiResult.overview,
      cards,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
