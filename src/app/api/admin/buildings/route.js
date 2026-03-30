import { prisma } from '@/lib/prisma';
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils';
import { createCampusBuildingCompatible, listCampusBuildingsCompatible, } from '@/lib/server/campusBuildings';
import { invalidateUniversityData, UNIVERSITY_DATA_TAGS } from '@/lib/server/universityData';
import { campusBuildingCreateSchema } from '@/lib/validations/admin';
export async function GET(request) {
    try {
        await getAuthenticatedAdmin('ADMIN_TAB_BUILDINGS');
        const universityId = request.nextUrl.searchParams.get('universityId') ?? undefined;
        const records = await listCampusBuildingsCompatible({
            where: {
                ...(universityId ? { universityId } : {}),
            },
            orderBy: [{ university: { name: 'asc' } }, { name: 'asc' }],
        });
        return successResponse(records);
    }
    catch (error) {
        return handleApiError(error);
    }
}
export async function POST(request) {
    try {
        await getAuthenticatedAdmin('ADMIN_TAB_BUILDINGS');
        const payload = campusBuildingCreateSchema.parse(await request.json());
        const university = await prisma.university.findUnique({
            where: { id: payload.universityId },
            select: { id: true },
        });
        if (!university) {
            throw new ApiError(404, 'University not found');
        }
        const record = await createCampusBuildingCompatible(payload);
        invalidateUniversityData(UNIVERSITY_DATA_TAGS.buildings);
        return successResponse(record, 201);
    }
    catch (error) {
        return handleApiError(error);
    }
}
