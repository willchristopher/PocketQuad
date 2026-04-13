import { prisma } from '@/lib/prisma';
import { canCreateDeadlineEvents } from '@/lib/facultyPermissions';
import { combineEventDateTime } from '@/lib/events';
import { didFacultyEventChange, formatFacultyEventTimeLabel, getFacultyEventOwner, notifyFavoritedStudentsAboutFacultyEvent, resolveFacultyEventBuilding, } from '@/lib/server/facultyEvents';
import { updateFacultyEventSchema } from '@/lib/validations';
import { ApiError, getAuthenticatedUser, handleApiError, resolveParams, successResponse, } from '@/lib/api/utils';
const facultyManagedEventSelect = {
    id: true,
    universityId: true,
    buildingId: true,
    title: true,
    description: true,
    imageUrl: true,
    date: true,
    endDate: true,
    time: true,
    location: true,
    category: true,
    audience: true,
    organizer: true,
    organizerId: true,
    maxAttendees: true,
    isPublished: true,
    isCancelled: true,
    createdAt: true,
    updatedAt: true,
    building: {
        select: {
            id: true,
            name: true,
            address: true,
            type: true,
        },
    },
};
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
                audience: true,
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
        if (payload.audience === 'DEADLINE' &&
            existing.audience !== 'DEADLINE' &&
            !canCreateDeadlineEvents(profile)) {
            throw new ApiError(403, 'You do not have permission to create deadline events');
        }
        const resolvedDate = payload.date ?? existing.date.toISOString().slice(0, 10);
        const resolvedTime = payload.time ?? existing.time;
        const startsAt = combineEventDateTime(resolvedDate, resolvedTime);
        if (!startsAt) {
            throw new ApiError(400, 'Unable to parse the updated event date and time.');
        }
        const updated = await prisma.event.update({
            where: { id },
            data: {
                ...(payload.title !== undefined ? { title: payload.title } : {}),
                ...(payload.description !== undefined ? { description: payload.description } : {}),
                ...(payload.date !== undefined || payload.time !== undefined ? { date: startsAt } : {}),
                ...(payload.time !== undefined
                    ? {
                        time: formatFacultyEventTimeLabel(payload.time),
                    }
                    : {}),
                ...(payload.location !== undefined ? { location: payload.location } : {}),
                ...(payload.category !== undefined ? { category: payload.category } : {}),
                ...(payload.audience !== undefined ? { audience: payload.audience } : {}),
                ...(payload.maxAttendees !== undefined ? { maxAttendees: payload.maxAttendees } : {}),
                ...(payload.buildingId !== undefined ? { buildingId: building?.id ?? null } : {}),
                ...(payload.isCancelled !== undefined ? { isCancelled: payload.isCancelled } : {}),
            },
            select: facultyManagedEventSelect,
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
export async function DELETE(_request, context) {
    try {
        const { profile } = await getAuthenticatedUser({
            includeManagedBuildings: true,
        });
        if (profile.role !== 'FACULTY' && profile.role !== 'ADMIN') {
            throw new ApiError(403, 'Faculty access required');
        }
        const { id } = await resolveParams(context);
        const existing = await prisma.event.findFirst({
            where: {
                id,
                organizerId: profile.id,
            },
            select: {
                id: true,
            },
        });
        if (!existing) {
            throw new ApiError(404, 'Event not found');
        }
        await prisma.event.delete({
            where: {
                id,
            },
        });
        return successResponse({
            deleted: true,
        });
    }
    catch (error) {
        return handleApiError(error);
    }
}
