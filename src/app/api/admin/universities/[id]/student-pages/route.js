import { prisma } from '@/lib/prisma';
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils';
import { UNIVERSITY_DATA_TAGS, invalidateUniversityData } from '@/lib/server/universityData';
import { sanitizeDisabledStudentPages, studentPageVisibilityOptions } from '@/lib/studentPageVisibility';
import { universityUpdateSchema } from '@/lib/validations/admin';

export async function PATCH(request, context) {
    try {
        await getAuthenticatedAdmin('ADMIN_TAB_STUDENT_PAGES');

        const { id } = await context.params;
        const payload = universityUpdateSchema.pick({ disabledStudentPages: true }).parse(await request.json());
        const disabledStudentPages = sanitizeDisabledStudentPages(payload.disabledStudentPages);
        if (disabledStudentPages.length >= studentPageVisibilityOptions.length) {
            throw new ApiError(400, 'At least one student page must remain visible');
        }

        const updated = await prisma.university.update({
            where: { id },
            data: {
                disabledStudentPages,
            },
            select: {
                id: true,
                disabledStudentPages: true,
            },
        });

        invalidateUniversityData(UNIVERSITY_DATA_TAGS.studentPages);
        return successResponse(updated);
    }
    catch (error) {
        return handleApiError(error);
    }
}
