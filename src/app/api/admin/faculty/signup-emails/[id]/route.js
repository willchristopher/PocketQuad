import { prisma } from '@/lib/prisma';
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils';
import { invalidateUniversityData, UNIVERSITY_DATA_TAGS } from '@/lib/server/universityData';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
function isOwnerAccount(profile) {
    return (profile.adminAccessLevel === 'OWNER' ||
        (profile.role === 'ADMIN' && profile.adminAccessLevel == null));
}
export async function DELETE(_request, context) {
    try {
        const { profile } = await getAuthenticatedAdmin('ADMIN_TAB_FACULTY');
        const isOwner = isOwnerAccount(profile);
        const { id } = await context.params;
        const existing = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                universityId: true,
                role: true,
                supabaseId: true,
                facultyProfile: {
                    select: { id: true },
                },
            },
        });
        if (!existing || existing.role !== 'FACULTY') {
            throw new ApiError(404, 'Faculty signup email record not found');
        }
        if (!isOwner && existing.universityId !== profile.universityId) {
            throw new ApiError(403, 'You can only remove faculty signup emails for your own university');
        }
        await prisma.user.delete({
            where: { id },
        });
        if (existing.supabaseId) {
            const supabaseAdmin = createSupabaseAdminClient();
            await supabaseAdmin.auth.admin.deleteUser(existing.supabaseId).catch(() => undefined);
        }
        invalidateUniversityData(UNIVERSITY_DATA_TAGS.faculty);
        return successResponse({ deleted: true });
    }
    catch (error) {
        return handleApiError(error);
    }
}
