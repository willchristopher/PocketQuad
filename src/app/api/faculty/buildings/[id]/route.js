import { hasPortalPermission } from '@/lib/auth/portalPermissions';
import { canManageBuilding } from '@/lib/facultyPermissions';
import { prisma } from '@/lib/prisma';
import { buildBuildingHoursPayload } from '@/lib/buildingHours';
import { listCampusBuildingsCompatible, updateCampusBuildingCompatible } from '@/lib/server/campusBuildings';
import { invalidateUniversityData, UNIVERSITY_DATA_TAGS, } from '@/lib/server/universityData';
import { updateManagedBuildingSchema } from '@/lib/validations';
import { ApiError, getAuthenticatedUser, handleApiError, successResponse, } from '@/lib/api/utils';
export async function PATCH(request, context) {
    try {
        const { profile } = await getAuthenticatedUser({
            includeManagedBuildings: true,
        });
        if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
            throw new ApiError(403, 'Faculty access required');
        }
        const { id } = await context.params;
        const payload = updateManagedBuildingSchema.parse(await request.json());
        if (!canManageBuilding(profile, id)) {
            throw new ApiError(403, 'You do not manage that building');
        }
        const [building] = await listCampusBuildingsCompatible({
            where: {
                id,
                ...(profile.universityId ? { universityId: profile.universityId } : {}),
            },
        });
        if (!building) {
            throw new ApiError(404, 'Building not found');
        }
        const { operatingHours, operatingHoursSchedule } = buildBuildingHoursPayload(payload);
        const operationalNote = payload.operationalNote?.trim() || null;
        const accessibilityNotes = payload.accessibilityNotes?.trim() || null;
        const updated = await updateCampusBuildingCompatible(id, {
            operatingHours,
            operatingHoursSchedule,
            operationalStatus: payload.operationalStatus,
            operationalNote,
            accessibilityNotes,
            operationalUpdatedAt: new Date(),
        });
        invalidateUniversityData(UNIVERSITY_DATA_TAGS.buildings);
        const statusChanged = building.operationalStatus !== updated.operationalStatus;
        const snapshotChanged = statusChanged ||
            (building.operationalNote ?? null) !== updated.operationalNote ||
            (building.operatingHours ?? null) !== updated.operatingHours ||
            JSON.stringify(building.operatingHoursSchedule ?? null) !== JSON.stringify(updated.operatingHoursSchedule ?? null);
        let notifiedCount = 0;
        if (snapshotChanged && profile.universityId) {
            const recipients = await prisma.user.findMany({
                where: {
                    id: {
                        not: profile.id,
                    },
                    role: 'STUDENT',
                    universityId: profile.universityId,
                    notificationPreferences: {
                        is: {
                            buildingAlerts: true,
                            buildingIds: {
                                has: updated.id,
                            },
                        },
                    },
                },
                select: {
                    id: true,
                },
            });
            if (recipients.length > 0) {
                const messageParts = [`Status: ${updated.operationalStatus}`];
                if (updated.operationalNote) {
                    messageParts.push(updated.operationalNote);
                }
                if (updated.operatingHours) {
                    messageParts.push(`Hours: ${updated.operatingHours}`);
                }
                await prisma.notification.createMany({
                    data: recipients.map((recipient) => ({
                        userId: recipient.id,
                        type: 'ANNOUNCEMENT',
                        title: statusChanged
                            ? `${updated.name} is now ${updated.operationalStatus}`
                            : `${updated.name} building details updated`,
                        message: messageParts.join(' • '),
                        actionUrl: `/campus-map?buildingId=${updated.id}`,
                        actionLabel: 'View building',
                    })),
                });
                notifiedCount = recipients.length;
            }
        }
        return successResponse({
            ...updated,
            notifiedCount,
        });
    }
    catch (error) {
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
        const { id } = await context.params;
        const canAdministerBuildings = hasPortalPermission(profile, 'ADMIN_TAB_BUILDINGS');
        if (!canAdministerBuildings &&
            !(profile.managedBuildings ?? []).some((assignment) => assignment.buildingId === id)) {
            throw new ApiError(403, 'You do not manage that building');
        }
        await prisma.buildingManagerAssignment.deleteMany({
            where: {
                userId: profile.id,
                buildingId: id,
            },
        });
        return successResponse({
            buildingId: id,
            managed: false,
        });
    }
    catch (error) {
        return handleApiError(error);
    }
}
