import { prisma } from '@/lib/prisma';
import { combineEventDateTime, formatEventTimeLabel } from '@/lib/events';
import { canManageBuilding } from '@/lib/facultyPermissions';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import { ApiError } from '@/lib/api/utils';
const facultyEventSelect = {
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
export function formatFacultyEventTimeLabel(time24) {
    return formatEventTimeLabel(time24);
}
function formatEventDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}
function formatEventMoment(date, time) {
    return `${formatEventDate(date)} at ${formatFacultyEventTimeLabel(time)}`;
}
export async function getFacultyEventOwner(userId) {
    const faculty = await prisma.faculty.findUnique({
        where: { userId },
        select: {
            id: true,
            universityId: true,
        },
    });
    if (!faculty) {
        throw new ApiError(403, 'Faculty profile is required for event management');
    }
    return faculty;
}
export async function resolveFacultyEventBuilding(profile, buildingId) {
    if (!buildingId) {
        return null;
    }
    if (!canManageBuilding(profile, buildingId)) {
        throw new ApiError(403, 'You do not manage that building');
    }
    const building = await prisma.campusBuilding.findFirst({
        where: {
            id: buildingId,
            ...(profile.universityId ? { universityId: profile.universityId } : {}),
        },
        select: {
            id: true,
            name: true,
            address: true,
            type: true,
        },
    });
    if (!building) {
        throw new ApiError(404, 'Building not found');
    }
    return building;
}
function getFacultyEventRecipients(facultyId) {
    return prisma.facultyFavorite.findMany({
        where: {
            facultyId,
            user: {
                role: 'STUDENT',
                notificationPreferences: {
                    is: {
                        newEvents: true,
                    },
                },
            },
        },
        select: {
            userId: true,
        },
    });
}
function hasFacultyEventDetailsChanged(previous, next) {
    return (previous.title !== next.title ||
        previous.description !== next.description ||
        previous.date.getTime() !== next.date.getTime() ||
        previous.time !== next.time ||
        previous.location !== next.location ||
        previous.category !== next.category ||
        previous.buildingId !== next.buildingId);
}
function buildUpdatedEventMessage(previous, next) {
    const changes = [];
    if (previous.date.getTime() !== next.date.getTime()) {
        changes.push(`date changed to ${formatEventDate(next.date)}`);
    }
    if (previous.time !== next.time) {
        changes.push(`time changed to ${formatFacultyEventTimeLabel(next.time)}`);
    }
    if (previous.location !== next.location) {
        changes.push(`location changed to ${next.location}`);
    }
    if (previous.title !== next.title) {
        changes.push(`title changed to ${next.title}`);
    }
    const changeLabel = changes.length > 0
        ? `${changes.slice(0, 2).join(', ')}.`
        : 'Event details were updated.';
    return `${changeLabel} Latest details: ${formatEventMoment(next.date, next.time)} · ${next.location}.`;
}
export async function notifyFavoritedStudentsAboutFacultyEvent(options) {
    const recipients = await getFacultyEventRecipients(options.facultyId);
    if (recipients.length === 0) {
        return 0;
    }
    let title = '';
    let message = '';
    if (options.type === 'NEW_EVENT') {
        title = `${options.actorName} created a new event`;
        message = `${options.event.title} is scheduled for ${formatEventMoment(options.event.date, options.event.time)} · ${options.event.location}.`;
    }
    else if (options.type === 'EVENT_CANCELLED') {
        title = `${options.actorName} canceled an event`;
        message = `${options.event.title} scheduled for ${formatEventMoment(options.event.date, options.event.time)} has been canceled.`;
    }
    else {
        title = `${options.actorName} updated an event`;
        message = buildUpdatedEventMessage(options.previousEvent ?? options.event, options.event);
    }
    await prisma.notification.createMany({
        data: recipients.map((recipient) => ({
            userId: recipient.userId,
            type: options.type,
            title,
            message,
            actionUrl: `/events/${options.event.id}`,
            actionLabel: 'View event',
        })),
    });
    return recipients.length;
}
export async function createFacultyOwnedEvent(options) {
    const faculty = await getFacultyEventOwner(options.profile.id);
    const building = await resolveFacultyEventBuilding(options.profile, options.payload.buildingId);
    const startsAt = combineEventDateTime(options.payload.date, options.payload.time);
    if (!startsAt) {
        throw new ApiError(400, 'Unable to parse the event date and time.');
    }
    const nextEventData = {
        universityId: options.profile.universityId ?? faculty.universityId,
        buildingId: building?.id ?? null,
        title: options.payload.title,
        description: options.payload.description,
        date: startsAt,
        time: formatFacultyEventTimeLabel(options.payload.time),
        location: options.payload.location ||
            (building ? `${building.name} · ${building.address}` : options.payload.location),
        category: options.payload.category,
        organizer: options.profile.displayName,
        organizerId: options.profile.id,
        maxAttendees: options.payload.maxAttendees ?? null,
        tags: [options.payload.category],
    };
    let event;
    try {
        event = await prisma.event.create({
            data: nextEventData,
            select: facultyEventSelect,
        });
    }
    catch (error) {
        if (!isPrismaSchemaCompatibilityError(error)) {
            throw error;
        }
        const { tags, ...legacyEventData } = nextEventData;
        event = await prisma.event.create({
            data: legacyEventData,
            select: facultyEventSelect,
        });
    }
    const notifiedCount = await notifyFavoritedStudentsAboutFacultyEvent({
        facultyId: faculty.id,
        actorName: options.profile.displayName,
        event,
        type: 'NEW_EVENT',
    });
    return {
        event,
        faculty,
        notifiedCount,
    };
}
export function didFacultyEventChange(previous, next) {
    const cancelledNow = !previous.isCancelled && next.isCancelled;
    return {
        cancelledNow,
        detailsChanged: hasFacultyEventDetailsChanged(previous, next),
    };
}
