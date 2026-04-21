import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';

function isResourceLinkPreferenceCompatibilityError(error) {
  if (isPrismaSchemaCompatibilityError(error)) {
    return true;
  }

  return error instanceof Error && /resource_link_ids|notification_preferences/i.test(error.message);
}

function normalizeResourceLinkIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => typeof item === 'string');
}

export async function readResourceLinkIds(userId) {
  try {
    const rows = await prisma.$queryRaw(
      Prisma.sql`SELECT resource_link_ids FROM notification_preferences WHERE user_id = ${userId} LIMIT 1`,
    );
    return normalizeResourceLinkIds(rows[0]?.resource_link_ids);
  } catch (error) {
    if (isResourceLinkPreferenceCompatibilityError(error)) {
      return [];
    }

    throw error;
  }
}

async function ensureNotificationPreferences(userId) {
  const existing = await prisma.notificationPreferences.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.notificationPreferences.create({
    data: { userId },
    select: { id: true },
  });
}

export async function writeResourceLinkIds(userId, resourceLinkIds) {
  await ensureNotificationPreferences(userId);

  const resourceLinkArraySql = resourceLinkIds.length > 0
    ? Prisma.sql`ARRAY[${Prisma.join(resourceLinkIds)}]::text[]`
    : Prisma.sql`ARRAY[]::text[]`;

  try {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE notification_preferences
        SET resource_link_ids = ${resourceLinkArraySql},
            updated_at = NOW()
        WHERE user_id = ${userId}
      `,
    );
  } catch (error) {
    if (isResourceLinkPreferenceCompatibilityError(error)) {
      throw new Error('RESOURCE_LINK_PREFERENCES_UNAVAILABLE');
    }

    throw error;
  }
}
