import { ensureCampusEventsFeedFresh } from '@/lib/server/campusEvents';
import {
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api/utils';

export async function POST() {
  try {
    const { profile } = await getAuthenticatedUser();
    const result = await ensureCampusEventsFeedFresh({
      force: true,
      universityId: profile.universityId ?? undefined,
    });

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
