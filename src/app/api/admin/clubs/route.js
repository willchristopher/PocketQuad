import { prisma } from '@/lib/prisma';
import { hasPortalPermission } from '@/lib/auth/portalPermissions';
import { ApiError, getAuthenticatedAdmin, getAuthenticatedPortalUser, handleApiError, requireAnyPortalPermission, successResponse, } from '@/lib/api/utils';
import { invalidateUniversityData, UNIVERSITY_DATA_TAGS } from '@/lib/server/universityData';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import { ensureMurrayStateOrganizationsLoaded } from '@/lib/server/murrayStateClubSync';
import { enrichMurrayStateOrganizationRecord } from '@/lib/data/murrayStateOrganizations';
import { clubCreateSchema } from '@/lib/validations/admin';
const clubUniversitySelect = {
    select: { id: true, name: true, slug: true },
};
const clubSelect = {
    id: true,
    universityId: true,
    name: true,
    category: true,
    description: true,
    contactEmail: true,
    presidentName: true,
    presidentEmail: true,
    advisorName: true,
    advisorEmail: true,
    publicContactInfo: true,
    sourceUrls: true,
    importNotes: true,
    websiteUrl: true,
    meetingInfo: true,
    createdAt: true,
    updatedAt: true,
    university: clubUniversitySelect,
};
const legacyClubSelect = {
    id: true,
    universityId: true,
    name: true,
    category: true,
    description: true,
    contactEmail: true,
    websiteUrl: true,
    meetingInfo: true,
    createdAt: true,
    updatedAt: true,
    university: clubUniversitySelect,
};
function withClubCompatibility(record) {
    return {
        ...record,
        presidentName: 'presidentName' in record ? record.presidentName ?? null : null,
        presidentEmail: 'presidentEmail' in record ? record.presidentEmail ?? null : null,
        advisorName: 'advisorName' in record ? record.advisorName ?? null : null,
        advisorEmail: 'advisorEmail' in record ? record.advisorEmail ?? null : null,
        publicContactInfo: 'publicContactInfo' in record ? record.publicContactInfo ?? null : null,
        sourceUrls: 'sourceUrls' in record ? record.sourceUrls ?? null : null,
        importNotes: 'importNotes' in record ? record.importNotes ?? null : null,
    };
}
export async function GET(request) {
    try {
        const { profile } = await getAuthenticatedPortalUser();
        requireAnyPortalPermission(profile, [
            'ADMIN_TAB_CLUBS',
            'CAN_MANAGE_CLUB_PROFILE',
            'CAN_MANAGE_CLUB_CONTACT',
        ]);
        const universityId = request.nextUrl.searchParams.get('universityId') ?? undefined;
        const canManageAllClubs = hasPortalPermission(profile, 'ADMIN_TAB_CLUBS');
        const managedClubIds = profile.managedClubs?.map((assignment) => assignment.clubId) ?? [];
        if (!canManageAllClubs && managedClubIds.length === 0) {
            return successResponse([]);
        }
        if (canManageAllClubs && universityId) {
            const syncResult = await ensureMurrayStateOrganizationsLoaded(universityId);
            if (syncResult.synced) {
                invalidateUniversityData(UNIVERSITY_DATA_TAGS.clubs);
            }
        }
        const where = {
            ...(canManageAllClubs
                ? universityId
                    ? { universityId }
                    : {}
                : { id: { in: managedClubIds } }),
        };
        let records;
        try {
            records = await prisma.clubOrganization.findMany({
                where,
                select: clubSelect,
                orderBy: [{ university: { name: 'asc' } }, { name: 'asc' }],
            });
        }
        catch (error) {
            if (!isPrismaSchemaCompatibilityError(error)) {
                throw error;
            }
            const legacyRecords = await prisma.clubOrganization.findMany({
                where,
                select: legacyClubSelect,
                orderBy: [{ university: { name: 'asc' } }, { name: 'asc' }],
            });
            records = legacyRecords.map((record) => withClubCompatibility(record));
        }
        const hydratedRecords = records.map((record) => record.university?.name?.toLowerCase().includes('murray state') || record.university?.slug?.toLowerCase().includes('murray')
            ? enrichMurrayStateOrganizationRecord(withClubCompatibility(record))
            : record);
        return successResponse(hydratedRecords);
    }
    catch (error) {
        return handleApiError(error);
    }
}
export async function POST(request) {
    try {
        await getAuthenticatedAdmin('ADMIN_TAB_CLUBS');
        const payload = clubCreateSchema.parse(await request.json());
        const university = await prisma.university.findUnique({
            where: { id: payload.universityId },
            select: { id: true },
        });
        if (!university) {
            throw new ApiError(404, 'University not found');
        }
        let record;
        try {
            record = await prisma.clubOrganization.create({
                data: payload,
                select: clubSelect,
            });
        }
        catch (error) {
            if (!isPrismaSchemaCompatibilityError(error)) {
                throw error;
            }
            const { presidentName, presidentEmail, advisorName, advisorEmail, publicContactInfo, sourceUrls, importNotes, ...legacyPayload } = payload;
            record = await prisma.clubOrganization.create({
                data: legacyPayload,
                select: legacyClubSelect,
            });
        }
        invalidateUniversityData(UNIVERSITY_DATA_TAGS.clubs);
        return successResponse(withClubCompatibility(record), 201);
    }
    catch (error) {
        return handleApiError(error);
    }
}
