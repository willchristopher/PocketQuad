import { hasPortalPermission } from '@/lib/auth/portalPermissions';
import { prisma } from '@/lib/prisma';
import { canManageBuilding, canPublishCampusAnnouncements } from '@/lib/facultyPermissions';
import { updateAnnouncementSchema } from '@/lib/validations';
import {
  ApiError,
  getAuthenticatedUser,
  handleApiError,
  resolveParams,
  successResponse,
} from '@/lib/api/utils';

async function getEditableAnnouncement(profile, id) {
  const announcement = await prisma.announcement.findFirst({
    where: {
      id,
      ...(profile.universityId ? { universityId: profile.universityId } : {}),
    },
    select: {
      id: true,
      scope: true,
      buildingId: true,
      serviceId: true,
      createdById: true,
    },
  });

  if (!announcement) {
    throw new ApiError(404, 'Announcement not found');
  }

  const canManageBuildings = hasPortalPermission(profile, 'ADMIN_TAB_BUILDINGS');
  const canManageServices = hasPortalPermission(profile, 'ADMIN_TAB_SERVICES');
  const canPublishCampus = canPublishCampusAnnouncements(profile);

  if (announcement.scope === 'BUILDING') {
    if (!announcement.buildingId || !canManageBuilding(profile, announcement.buildingId)) {
      throw new ApiError(403, 'You do not have permission to manage that building announcement');
    }
  } else if (announcement.scope === 'SERVICE') {
    if (!canManageServices) {
      throw new ApiError(403, 'You do not have permission to manage that service announcement');
    }
  } else if (!canPublishCampus && announcement.createdById !== profile.id) {
    throw new ApiError(403, 'You do not have permission to manage that campus announcement');
  }

  if (!canManageBuildings && announcement.scope === 'BUILDING' && !announcement.buildingId) {
    throw new ApiError(403, 'Building announcement access required');
  }

  return announcement;
}

export async function PATCH(request, context) {
  try {
    const { profile } = await getAuthenticatedUser({
      includeManagedBuildings: true,
    });

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required');
    }

    const { id } = await resolveParams(context);
    await getEditableAnnouncement(profile, id);
    const payload = updateAnnouncementSchema.parse(await request.json());

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        title: payload.title,
        message: payload.message,
        linkUrl: payload.linkUrl || null,
        expiresAt: payload.expiresAt ?? null,
      },
      select: {
        id: true,
        title: true,
        message: true,
        expiresAt: true,
        createdAt: true,
        buildingId: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request, context) {
  try {
    const { profile } = await getAuthenticatedUser({
      includeManagedBuildings: true,
    });

    if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
      throw new ApiError(403, 'Faculty access required');
    }

    const { id } = await resolveParams(context);
    await getEditableAnnouncement(profile, id);
    await prisma.announcement.delete({
      where: { id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
