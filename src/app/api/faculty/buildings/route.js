import { prisma } from '@/lib/prisma';
import { getFacultyBuildingsData } from '@/lib/server/facultyWorkspace';
import { facultyBuildingManagerSchema } from '@/lib/validations';
import { ApiError, getAuthenticatedUser, handleApiError, successResponse, } from '@/lib/api/utils';
export async function GET() {
    try {
        const { profile } = await getAuthenticatedUser({
            includeManagedBuildings: true,
        });
        if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
            throw new ApiError(403, 'Faculty access required');
        }
        if (!profile.universityId) {
            return successResponse({
                availableBuildings: [],
                managedBuildings: [],
            });
        }
        return successResponse(await getFacultyBuildingsData(profile));
    }
    catch (error) {
        return handleApiError(error);
    }
}
export async function POST(request) {
    try {
        const { profile } = await getAuthenticatedUser({
            includeManagedBuildings: true,
        });
        if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
            throw new ApiError(403, 'Faculty access required');
        }
        if (!profile.universityId) {
            throw new ApiError(400, 'University association required');
        }
        const payload = facultyBuildingManagerSchema.parse(await request.json());
        const building = await prisma.campusBuilding.findFirst({
            where: {
                id: payload.buildingId,
                universityId: profile.universityId,
            },
            select: {
                id: true,
                name: true,
                type: true,
            },
        });
        if (!building) {
            throw new ApiError(404, 'Building not found');
        }
        await prisma.buildingManagerAssignment.upsert({
            where: {
                userId_buildingId: {
                    userId: profile.id,
                    buildingId: building.id,
                },
            },
            update: {},
            create: {
                userId: profile.id,
                buildingId: building.id,
            },
        });
        return successResponse({
            building,
            managed: true,
        }, 201);
    }
    catch (error) {
        return handleApiError(error);
    }
}
