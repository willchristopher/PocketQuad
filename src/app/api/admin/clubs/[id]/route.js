import { prisma } from '@/lib/prisma';
import { hasPortalPermission } from '@/lib/auth/portalPermissions';
import { ApiError, getAuthenticatedAdmin, getAuthenticatedPortalUser, handleApiError, requireAnyPortalPermission, successResponse, } from '@/lib/api/utils';
import { invalidateUniversityData, UNIVERSITY_DATA_TAGS } from '@/lib/server/universityData';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import { clubUpdateSchema } from '@/lib/validations/admin';
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
export async function PATCH(request, context) {
    try {
        const { profile } = await getAuthenticatedPortalUser();
        const { id } = await context.params;
        const payload = clubUpdateSchema.parse(await request.json());
        const canManageAllClubs = hasPortalPermission(profile, 'ADMIN_TAB_CLUBS');
        if (canManageAllClubs && payload.universityId) {
            const university = await prisma.university.findUnique({
                where: { id: payload.universityId },
                select: { id: true },
            });
            if (!university) {
                throw new ApiError(404, 'University not found');
            }
        }
        let updateData = payload;
        if (!canManageAllClubs) {
            requireAnyPortalPermission(profile, [
                'CAN_MANAGE_CLUB_PROFILE',
                'CAN_MANAGE_CLUB_CONTACT',
            ]);
            const assignedClubIds = new Set(profile.managedClubs?.map((assignment) => assignment.clubId) ?? []);
            if (!assignedClubIds.has(id)) {
                throw new ApiError(403, 'You can only manage clubs assigned to your account');
            }
            const canManageProfile = hasPortalPermission(profile, 'CAN_MANAGE_CLUB_PROFILE');
            const canManageContact = hasPortalPermission(profile, 'CAN_MANAGE_CLUB_CONTACT');
            if (payload.universityId) {
                throw new ApiError(403, 'You do not have permission to reassign club ownership');
            }
            const profileFieldTouched = payload.name !== undefined ||
                payload.category !== undefined ||
                payload.description !== undefined ||
                payload.meetingInfo !== undefined;
            const contactFieldTouched = payload.contactEmail !== undefined ||
                payload.websiteUrl !== undefined ||
                payload.presidentName !== undefined ||
                payload.presidentEmail !== undefined ||
                payload.advisorName !== undefined ||
                payload.advisorEmail !== undefined ||
                payload.publicContactInfo !== undefined ||
                payload.sourceUrls !== undefined ||
                payload.importNotes !== undefined;
            if (profileFieldTouched && !canManageProfile) {
                throw new ApiError(403, 'You do not have permission to edit club details');
            }
            if (contactFieldTouched && !canManageContact) {
                throw new ApiError(403, 'You do not have permission to edit club contact details');
            }
            updateData = {
                ...(canManageProfile
                    ? {
                        ...(payload.name !== undefined ? { name: payload.name } : {}),
                        ...(payload.category !== undefined ? { category: payload.category } : {}),
                        ...(payload.description !== undefined ? { description: payload.description } : {}),
                        ...(payload.meetingInfo !== undefined ? { meetingInfo: payload.meetingInfo } : {}),
                    }
                    : {}),
                ...(canManageContact
                    ? {
                        ...(payload.contactEmail !== undefined
                            ? { contactEmail: payload.contactEmail }
                            : {}),
                        ...(payload.presidentName !== undefined
                            ? { presidentName: payload.presidentName }
                            : {}),
                        ...(payload.presidentEmail !== undefined
                            ? { presidentEmail: payload.presidentEmail }
                            : {}),
                        ...(payload.advisorName !== undefined
                            ? { advisorName: payload.advisorName }
                            : {}),
                        ...(payload.advisorEmail !== undefined
                            ? { advisorEmail: payload.advisorEmail }
                            : {}),
                        ...(payload.publicContactInfo !== undefined
                            ? { publicContactInfo: payload.publicContactInfo }
                            : {}),
                        ...(payload.sourceUrls !== undefined
                            ? { sourceUrls: payload.sourceUrls }
                            : {}),
                        ...(payload.importNotes !== undefined
                            ? { importNotes: payload.importNotes }
                            : {}),
                        ...(payload.websiteUrl !== undefined ? { websiteUrl: payload.websiteUrl } : {}),
                    }
                    : {}),
            };
            if (Object.keys(updateData).length === 0) {
                throw new ApiError(400, 'No editable fields provided');
            }
        }
        let updated;
        try {
            updated = await prisma.clubOrganization.update({
                where: { id },
                data: updateData,
                select: clubSelect,
            });
        }
        catch (error) {
            if (!isPrismaSchemaCompatibilityError(error)) {
                throw error;
            }
            const { presidentName, presidentEmail, advisorName, advisorEmail, publicContactInfo, sourceUrls, importNotes, ...legacyUpdateData } = updateData;
            updated = await prisma.clubOrganization.update({
                where: { id },
                data: legacyUpdateData,
                select: legacyClubSelect,
            });
        }
        invalidateUniversityData(UNIVERSITY_DATA_TAGS.clubs);
        return successResponse(withClubCompatibility(updated));
    }
    catch (error) {
        return handleApiError(error);
    }
}
export async function DELETE(_request, context) {
    try {
        await getAuthenticatedAdmin('ADMIN_TAB_CLUBS');
        const { id } = await context.params;
        await prisma.clubOrganization.delete({ where: { id } });
        invalidateUniversityData(UNIVERSITY_DATA_TAGS.clubs);
        return successResponse({ deleted: true });
    }
    catch (error) {
        return handleApiError(error);
    }
}
