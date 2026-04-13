import { prisma } from '@/lib/prisma';
import { buildBuildingHoursPayload } from '@/lib/buildingHours';
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils';
import { updateCampusBuildingCompatible } from '@/lib/server/campusBuildings';
import { invalidateUniversityData, UNIVERSITY_DATA_TAGS } from '@/lib/server/universityData';
import { campusBuildingUpdateSchema } from '@/lib/validations/admin';
export async function PATCH(request, context) {
    try {
        await getAuthenticatedAdmin('ADMIN_TAB_BUILDINGS');
        const { id } = await context.params;
        const payload = campusBuildingUpdateSchema.parse(await request.json());
        if (payload.universityId) {
            const university = await prisma.university.findUnique({
                where: { id: payload.universityId },
                select: { id: true },
            });
            if (!university) {
                throw new ApiError(404, 'University not found');
            }
        }
        const { operatingHours, operatingHoursSchedule } = buildBuildingHoursPayload(payload);
        const updated = await updateCampusBuildingCompatible(id, {
            ...payload,
            operatingHours,
            operatingHoursSchedule,
        });
        invalidateUniversityData(UNIVERSITY_DATA_TAGS.buildings);
        return successResponse(updated);
    }
    catch (error) {
        return handleApiError(error);
    }
}
export async function DELETE(_request, context) {
    try {
        await getAuthenticatedAdmin('ADMIN_TAB_BUILDINGS');
        const { id } = await context.params;
        await prisma.campusBuilding.delete({ where: { id } });
        invalidateUniversityData(UNIVERSITY_DATA_TAGS.buildings);
        return successResponse({ deleted: true });
    }
    catch (error) {
        return handleApiError(error);
    }
}
