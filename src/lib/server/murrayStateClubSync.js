import { prisma } from '@/lib/prisma';
import { MURRAY_STATE_ORGANIZATIONS } from '@/lib/data/murrayStateOrganizations';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';

const AUTO_SYNC_MINIMUM_ROWS = 100;
function normalizeClubName(name) {
  return name.trim().toLowerCase();
}

function extractPrimaryEmail(value) {
  const match = value?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : null;
}

function buildClubDescription(name, category) {
  const normalizedCategory = category?.trim().toLowerCase() || 'student';
  return `${name} is a ${normalizedCategory} organization at Murray State University. Use the listed student and advisor contacts to learn how to get involved.`;
}

async function isMurrayStateUniversity(universityId) {
  const university = await prisma.university.findUnique({
    where: { id: universityId },
    select: {
      name: true,
      slug: true,
      domain: true,
    },
  });

  if (!university) {
    return false;
  }

  return (
    university.name?.toLowerCase().includes('murray state') ||
    university.slug?.toLowerCase().includes('murray') ||
    university.domain?.toLowerCase().includes('murraystate.edu')
  );
}

export async function syncMurrayStateOrganizations(universityId) {
  const existingRows = await prisma.clubOrganization.findMany({
    where: { universityId },
    select: {
      id: true,
      name: true,
      description: true,
      contactEmail: true,
    },
  });

  const existingByName = new Map(existingRows.map((club) => [normalizeClubName(club.name), club]));

  let createdCount = 0;
  let updatedCount = 0;

  const runSync = async (includeExtendedFields) => {
    const rowsToCreate = [];
    const rowsToUpdate = [];

    for (const organization of MURRAY_STATE_ORGANIZATIONS) {
      const existing = existingByName.get(normalizeClubName(organization.name));
      const importedContactEmail =
        extractPrimaryEmail(organization.presidentEmail) ??
        extractPrimaryEmail(organization.advisorEmail);

      const extendedFields = includeExtendedFields
        ? {
            presidentName: organization.presidentName || null,
            presidentEmail: organization.presidentEmail || null,
            advisorName: organization.advisorName || null,
            advisorEmail: organization.advisorEmail || null,
            publicContactInfo: organization.publicContactInfo || null,
            sourceUrls: organization.sourceUrls || null,
            importNotes: organization.importNotes || null,
          }
        : {};

      if (existing) {
        rowsToUpdate.push({
          id: existing.id,
          data: {
            category: organization.category,
            contactEmail: existing.contactEmail || importedContactEmail || null,
            description:
              existing.description?.trim() ||
              buildClubDescription(organization.name, organization.category),
            ...extendedFields,
          },
        });
        continue;
      }

      rowsToCreate.push({
        data: {
          universityId,
          name: organization.name,
          category: organization.category,
          description: buildClubDescription(organization.name, organization.category),
          contactEmail: importedContactEmail,
          websiteUrl: null,
          meetingInfo: null,
          ...extendedFields,
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      if (rowsToCreate.length > 0) {
        await tx.clubOrganization.createMany({
          data: rowsToCreate.map((row) => row.data),
        });
      }

      for (const { id, data } of rowsToUpdate) {
        await tx.clubOrganization.update({
          where: { id },
          data,
        });
      }
    }, { timeout: 60_000 });

    createdCount = rowsToCreate.length;
    updatedCount = rowsToUpdate.length;
  };

  try {
    await runSync(true);
  } catch (error) {
    if (!isPrismaSchemaCompatibilityError(error)) {
      throw error;
    }

    createdCount = 0;
    updatedCount = 0;
    await runSync(false);
  }

  return {
    createdCount,
    updatedCount,
    totalRows: MURRAY_STATE_ORGANIZATIONS.length,
  };
}

export async function ensureMurrayStateOrganizationsLoaded(universityId) {
  if (!universityId) {
    return { synced: false, skipped: true };
  }

  const [isMurrayState, clubCount] = await Promise.all([
    isMurrayStateUniversity(universityId),
    prisma.clubOrganization.count({ where: { universityId } }),
  ]);

  if (!isMurrayState) {
    return { synced: false, skipped: true };
  }

  let needsMetadataBackfill = false;

  try {
    const missingMetadataCount = await prisma.clubOrganization.count({
      where: {
        universityId,
        OR: [{ sourceUrls: null }, { importNotes: null }],
      },
    });
    needsMetadataBackfill = missingMetadataCount > 0;
  } catch (error) {
    if (!isPrismaSchemaCompatibilityError(error)) {
      throw error;
    }
  }

  if (clubCount >= AUTO_SYNC_MINIMUM_ROWS && !needsMetadataBackfill) {
    return { synced: false, skipped: true };
  }

  const result = await syncMurrayStateOrganizations(universityId);
  return {
    ...result,
    synced: true,
    skipped: false,
  };
}
