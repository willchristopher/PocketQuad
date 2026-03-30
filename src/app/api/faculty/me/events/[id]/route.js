import { prisma } from '@/lib/prisma';
import { didFacultyEventChange, formatFacultyEventTimeLabel, getFacultyEventOwner, notifyFavoritedStudentsAboutFacultyEvent, resolveFacultyEventBuilding, } from '@/lib/server/facultyEvents';
import { updateFacultyEventSchema } from '@/lib/validations';
import { ApiError, getAuthenticatedUser, handleApiError, resolveParams, successResponse, } from '@/lib/api/utils';
export async function PATCH(request, context) {
    try {
        const { profile } = await getAuthenticatedUser({
            includeManagedBuildings: true,
        });
        if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
            throw new ApiError(403, 'Faculty access required');
        }
        const { id } = await resolveParams(context);
        const payload = updateFacultyEventSchema.parse(await request.json());
        const faculty = await getFacultyEventOwner(profile.id);
        const existing = await prisma.event.findFirst({
            where: {
                id,
                organizerId: profile.id,
            },
            select: {
                id: true,
                title: true,
                description: true,
                date: true,
                time: true,
                location: true,
                category: true,
                buildingId: true,
                isCancelled: true,
                maxAttendees: true,
            },
        });
        if (!existing) {
            throw new ApiError(404, 'Event not found');
        }
        const building = payload.buildingId !== undefined
            ? await resolveFacultyEventBuilding(profile, payload.buildingId)
            : undefined;
        const updated = await prisma.event.update({
            where: { id },
            data: {
                ...(payload.title !== undefined ? { title: payload.title } : {}),
                ...(payload.description !== undefined ? { description: payload.description } : {}),
                ...(payload.date !== undefined ? { date: new Date(`${payload.date}T00:00:00`) } : {}),
                ...(payload.time !== undefined
                    ? {
                        time: formatFacultyEventTimeLabel(payload.time),
                    }
                    : {}),
                ...(payload.location !== undefined ? { location: payload.location } : {}),
                ...(payload.category !== undefined ? { category: payload.category } : {}),
                ...(payload.maxAttendees !== undefined ? { maxAttendees: payload.maxAttendees } : {}),
                ...(payload.buildingId !== undefined ? { buildingId: building?.id ?? null } : {}),
                ...(payload.isCancelled !== undefined ? { isCancelled: payload.isCancelled } : {}),
            },
            include: {
                building: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        type: true,
                    },
                },
            },
        });
        const change = didFacultyEventChange(existing, updated);
        let notifiedCount = 0;
        if (change.cancelledNow) {
            notifiedCount = await notifyFavoritedStudentsAboutFacultyEvent({
                facultyId: faculty.id,
                actorName: profile.displayName,
                event: updated,
                type: 'EVENT_CANCELLED',
            });
        }
        else if (change.detailsChanged) {
            notifiedCount = await notifyFavoritedStudentsAboutFacultyEvent({
                facultyId: faculty.id,
                actorName: profile.displayName,
                event: updated,
                previousEvent: existing,
                type: 'EVENT_UPDATED',
            });
        }
        return successResponse({
            ...updated,
            notifiedCount,
        });
    }
    catch (error) {
        return handleApiError(error);
    }
}
