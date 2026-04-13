import { hasPortalPermission, } from '@/lib/auth/portalPermissions';
export function canPublishCampusAnnouncements(profile) {
    return hasPortalPermission(profile, 'CAN_PUBLISH_ANNOUNCEMENTS');
}

export function canCreateDeadlineEvents(profile) {
    return hasPortalPermission(profile, 'CAN_CREATE_DEADLINE_EVENTS');
}

export function canManageBuilding(profile, buildingId) {
    return (hasPortalPermission(profile, 'ADMIN_TAB_BUILDINGS') ||
        (profile.managedBuildings ?? []).some((assignment) => assignment.buildingId === buildingId));
}
