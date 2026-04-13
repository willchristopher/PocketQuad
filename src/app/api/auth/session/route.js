import { handleApiError, successResponse } from '@/lib/api/utils';
import { getServerAuthSnapshot } from '@/lib/auth/snapshot';
export async function GET() {
    try {
        const snapshot = await getServerAuthSnapshot();
        if (!snapshot.user || !snapshot.profile) {
            return successResponse({ session: null, user: null, profile: null });
        }
        return successResponse({
            session: snapshot.session,
            user: snapshot.user,
            profile: snapshot.profile,
        });
    }
    catch (error) {
        return handleApiError(error);
    }
}
