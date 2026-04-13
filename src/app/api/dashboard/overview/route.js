import { getAuthenticatedUser, handleApiError, successResponse } from '@/lib/api/utils';
import { getDashboardOverview } from '@/lib/server/dashboardOverview';
export async function GET() {
    try {
        const { profile } = await getAuthenticatedUser();
        return successResponse(await getDashboardOverview(profile));
    }
    catch (error) {
        return handleApiError(error);
    }
}
