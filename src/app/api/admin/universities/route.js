import { prisma } from '@/lib/prisma';
import { getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils';
import { listAdminUniversitiesCompatible } from '@/lib/server/adminUniversities';
import { ALL_UNIVERSITY_DATA_TAGS, invalidateUniversityData } from '@/lib/server/universityData';
import { universityCreateSchema } from '@/lib/validations/admin';
import { slugifyUniversityName } from '@/lib/university';
export async function GET() {
    try {
        await getAuthenticatedAdmin('ADMIN_TAB_UNIVERSITIES');
        const universities = await listAdminUniversitiesCompatible();
        return successResponse(universities);
    }
    catch (error) {
        return handleApiError(error);
    }
}
export async function POST(request) {
    try {
        await getAuthenticatedAdmin('ADMIN_TAB_UNIVERSITIES');
        const payload = universityCreateSchema.parse(await request.json());
        const university = await prisma.university.create({
            data: {
                name: payload.name,
                slug: payload.slug ?? slugifyUniversityName(payload.name),
                domain: payload.domain,
            },
        });
        invalidateUniversityData(...ALL_UNIVERSITY_DATA_TAGS);
        return successResponse(university, 201);
    }
    catch (error) {
        return handleApiError(error);
    }
}
