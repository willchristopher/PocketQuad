import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils';
import { getBuildingCatalogData } from '@/lib/server/buildingCatalog';
export async function GET(request) {
    try {
        const { profile } = await getAuthenticatedUser();
        const query = request.nextUrl.searchParams.get('search')?.trim();
        const requestedUniversityId = request.nextUrl.searchParams.get('universityId') ?? undefined;
        const buildings = await getBuildingCatalogData(profile, {
            query,
            requestedUniversityId,
        });
        return successResponse(buildings);
    }
    catch (error) {
        return handleApiError(error);
    }
}
