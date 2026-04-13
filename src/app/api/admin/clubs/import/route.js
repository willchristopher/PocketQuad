import { prisma } from '@/lib/prisma';
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils';
import { clubImportPresetSchema } from '@/lib/validations/admin';
import { invalidateUniversityData, UNIVERSITY_DATA_TAGS } from '@/lib/server/universityData';
import { syncMurrayStateOrganizations } from '@/lib/server/murrayStateClubSync';

export async function POST(request) {
  try {
    await getAuthenticatedAdmin('ADMIN_TAB_CLUBS');

    const payload = clubImportPresetSchema.parse(await request.json());

    if (payload.preset !== 'murray-state-organizations') {
      throw new ApiError(400, 'Unsupported club import preset');
    }

    const university = await prisma.university.findUnique({
      where: { id: payload.universityId },
      select: { id: true, name: true },
    });

    if (!university) {
      throw new ApiError(404, 'University not found');
    }

    const { createdCount, updatedCount, totalRows } = await syncMurrayStateOrganizations(
      payload.universityId,
    );

    invalidateUniversityData(UNIVERSITY_DATA_TAGS.clubs);

    return successResponse({
      createdCount,
      updatedCount,
      totalRows,
      universityName: university.name,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
