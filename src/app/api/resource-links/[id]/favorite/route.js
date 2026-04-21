import { prisma } from '@/lib/prisma';
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  resolveParams,
  successResponse,
} from '@/lib/api/utils';
import { readResourceLinkIds, writeResourceLinkIds } from '@/lib/resourceLinkPreferences';

const RESOURCE_LINK_MIGRATION_ERROR =
  'Resource link pinning is not available until the latest database migrations are applied.';

export async function POST(_request, context) {
  try {
    const { profile } = await getAuthenticatedUser();
    const { id } = await resolveParams(context);

    const resourceLink = await prisma.campusResourceLink.findFirst({
      where: {
        id,
        ...(profile.universityId ? { universityId: profile.universityId } : {}),
      },
      select: {
        id: true,
      },
    });

    if (!resourceLink) {
      throw new ApiError(404, 'Resource link not found');
    }

    const currentResourceLinkIds = await readResourceLinkIds(profile.id);
    const isFavorited = !currentResourceLinkIds.includes(id);
    const resourceLinkIds = isFavorited
      ? [id, ...currentResourceLinkIds.filter((resourceLinkId) => resourceLinkId !== id)]
      : currentResourceLinkIds.filter((resourceLinkId) => resourceLinkId !== id);

    try {
      await writeResourceLinkIds(profile.id, resourceLinkIds);
    } catch (error) {
      if (error instanceof Error && error.message === 'RESOURCE_LINK_PREFERENCES_UNAVAILABLE') {
        throw new ApiError(503, RESOURCE_LINK_MIGRATION_ERROR);
      }

      throw error;
    }

    return successResponse({
      resourceLinkId: id,
      resourceLinkIds,
      isFavorited,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
