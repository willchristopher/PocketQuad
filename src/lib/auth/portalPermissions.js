/** @typedef {'STUDENT' | 'FACULTY' | 'ADMIN'} AppRole */
/** @typedef {'OWNER' | 'IT_ADMIN' | 'CLUB_PRESIDENT' | 'CONTENT_MANAGER'} AdminAccessLevel */
/** @typedef {'ADMIN_PORTAL_ACCESS' | 'ADMIN_TAB_OVERVIEW' | 'ADMIN_TAB_UNIVERSITIES' | 'ADMIN_TAB_STUDENT_PAGES' | 'ADMIN_TAB_FACULTY' | 'ADMIN_TAB_BUILDINGS' | 'ADMIN_TAB_BUILDING_IMPORT' | 'ADMIN_TAB_LINKS' | 'ADMIN_TAB_SERVICES' | 'ADMIN_TAB_CLUBS' | 'ADMIN_TAB_EVENTS' | 'ADMIN_TAB_CHAT' | 'ADMIN_TAB_IT_ACCOUNTS' | 'ADMIN_TAB_USERS' | 'CAN_PUBLISH_ANNOUNCEMENTS' | 'CAN_CREATE_DEADLINE_EVENTS' | 'CAN_MANAGE_CLUB_PROFILE' | 'CAN_MANAGE_CLUB_CONTACT'} PortalPermission */
/** @typedef {'overview' | 'universities' | 'student-pages' | 'faculty' | 'buildings' | 'building-import' | 'links' | 'services' | 'clubs' | 'events' | 'chat' | 'it-accounts' | 'users'} AdminTabValue */
/** @typedef {{ role: AppRole, adminAccessLevel?: AdminAccessLevel | null, portalPermissions?: PortalPermission[] | null, canPublishCampusAnnouncements?: boolean }} PortalPermissionProfile */

/** @type {AdminAccessLevel[]} */
export const ADMIN_ACCESS_LEVELS = [
    'OWNER',
    'IT_ADMIN',
    'CLUB_PRESIDENT',
    'CONTENT_MANAGER',
];
/** @type {PortalPermission[]} */
export const PORTAL_PERMISSIONS = [
    'ADMIN_PORTAL_ACCESS',
    'ADMIN_TAB_OVERVIEW',
    'ADMIN_TAB_UNIVERSITIES',
    'ADMIN_TAB_STUDENT_PAGES',
    'ADMIN_TAB_FACULTY',
    'ADMIN_TAB_BUILDINGS',
    'ADMIN_TAB_BUILDING_IMPORT',
    'ADMIN_TAB_LINKS',
    'ADMIN_TAB_SERVICES',
    'ADMIN_TAB_CLUBS',
    'ADMIN_TAB_EVENTS',
    'ADMIN_TAB_CHAT',
    'ADMIN_TAB_IT_ACCOUNTS',
    'ADMIN_TAB_USERS',
    'CAN_PUBLISH_ANNOUNCEMENTS',
    'CAN_CREATE_DEADLINE_EVENTS',
    'CAN_MANAGE_CLUB_PROFILE',
    'CAN_MANAGE_CLUB_CONTACT',
];
/** @type {Record<AdminTabValue, PortalPermission>} */
export const ADMIN_TAB_PERMISSION = {
    overview: 'ADMIN_TAB_OVERVIEW',
    universities: 'ADMIN_TAB_UNIVERSITIES',
    'student-pages': 'ADMIN_TAB_STUDENT_PAGES',
    faculty: 'ADMIN_TAB_FACULTY',
    buildings: 'ADMIN_TAB_BUILDINGS',
    'building-import': 'ADMIN_TAB_BUILDING_IMPORT',
    links: 'ADMIN_TAB_LINKS',
    services: 'ADMIN_TAB_SERVICES',
    clubs: 'ADMIN_TAB_CLUBS',
    events: 'ADMIN_TAB_EVENTS',
    chat: 'ADMIN_TAB_CHAT',
    'it-accounts': 'ADMIN_TAB_IT_ACCOUNTS',
    users: 'ADMIN_TAB_USERS',
};
const OWNER_PERMISSIONS = [
    'ADMIN_PORTAL_ACCESS',
    'ADMIN_TAB_OVERVIEW',
    'ADMIN_TAB_UNIVERSITIES',
    'ADMIN_TAB_STUDENT_PAGES',
    'ADMIN_TAB_FACULTY',
    'ADMIN_TAB_BUILDINGS',
    'ADMIN_TAB_BUILDING_IMPORT',
    'ADMIN_TAB_LINKS',
    'ADMIN_TAB_SERVICES',
    'ADMIN_TAB_CLUBS',
    'ADMIN_TAB_EVENTS',
    'ADMIN_TAB_CHAT',
    'ADMIN_TAB_IT_ACCOUNTS',
    'ADMIN_TAB_USERS',
    'CAN_PUBLISH_ANNOUNCEMENTS',
    'CAN_CREATE_DEADLINE_EVENTS',
    'CAN_MANAGE_CLUB_PROFILE',
    'CAN_MANAGE_CLUB_CONTACT',
];
const IT_ADMIN_PERMISSIONS = [
    'ADMIN_PORTAL_ACCESS',
    'ADMIN_TAB_OVERVIEW',
    'ADMIN_TAB_STUDENT_PAGES',
    'ADMIN_TAB_FACULTY',
    'ADMIN_TAB_BUILDINGS',
    'ADMIN_TAB_BUILDING_IMPORT',
    'ADMIN_TAB_LINKS',
    'ADMIN_TAB_SERVICES',
    'ADMIN_TAB_EVENTS',
    'ADMIN_TAB_CHAT',
    'ADMIN_TAB_USERS',
];
const CLUB_PRESIDENT_PERMISSIONS = [
    'ADMIN_PORTAL_ACCESS',
    'ADMIN_TAB_OVERVIEW',
    'ADMIN_TAB_CLUBS',
    'ADMIN_TAB_EVENTS',
    'CAN_PUBLISH_ANNOUNCEMENTS',
    'CAN_MANAGE_CLUB_PROFILE',
    'CAN_MANAGE_CLUB_CONTACT',
];
const CONTENT_MANAGER_PERMISSIONS = [
    'ADMIN_PORTAL_ACCESS',
    'ADMIN_TAB_OVERVIEW',
    'ADMIN_TAB_LINKS',
    'ADMIN_TAB_SERVICES',
    'ADMIN_TAB_EVENTS',
    'CAN_PUBLISH_ANNOUNCEMENTS',
];
/**
 * @param {AdminAccessLevel} level
 * @returns {PortalPermission[]}
 */
export function getDefaultPermissionsForAccessLevel(level) {
    if (level === 'OWNER')
        return OWNER_PERMISSIONS;
    if (level === 'IT_ADMIN')
        return IT_ADMIN_PERMISSIONS;
    if (level === 'CLUB_PRESIDENT')
        return CLUB_PRESIDENT_PERMISSIONS;
    return CONTENT_MANAGER_PERMISSIONS;
}
/**
 * @param {Iterable<PortalPermission | null | undefined>} permissions
 * @returns {PortalPermission[]}
 */
export function dedupePermissions(permissions) {
    const unique = new Set();
    for (const permission of permissions) {
        if (permission)
            unique.add(permission);
    }
    return Array.from(unique);
}
/**
 * @param {PortalPermissionProfile} profile
 * @returns {PortalPermission[]}
 */
export function resolvePortalPermissions(profile) {
    const seed = profile.portalPermissions ?? [];
    const effectiveAccessLevel = profile.adminAccessLevel ??
        (profile.role === 'ADMIN' ? 'OWNER' : null);
    const levelPermissions = effectiveAccessLevel
        ? getDefaultPermissionsForAccessLevel(effectiveAccessLevel)
        : [];
    const permissions = dedupePermissions([...seed, ...levelPermissions]);
    if (profile.canPublishCampusAnnouncements) {
        permissions.push('CAN_PUBLISH_ANNOUNCEMENTS');
    }
    if (profile.role === 'ADMIN' && !permissions.includes('ADMIN_PORTAL_ACCESS')) {
        permissions.push('ADMIN_PORTAL_ACCESS');
    }
    return dedupePermissions(permissions);
}
/** @param {PortalPermissionProfile} profile */
export function canAccessAdminPortal(profile) {
    if (profile.role === 'ADMIN')
        return true;
    const permissions = resolvePortalPermissions(profile);
    return permissions.includes('ADMIN_PORTAL_ACCESS');
}
/**
 * @param {PortalPermissionProfile} profile
 * @param {PortalPermission} permission
 */
export function hasPortalPermission(profile, permission) {
    if (profile.role === 'ADMIN' && profile.adminAccessLevel == null) {
        return true;
    }
    const permissions = resolvePortalPermissions(profile);
    return permissions.includes(permission);
}
/**
 * @param {PortalPermissionProfile} profile
 * @param {PortalPermission[]} permissions
 */
export function hasAnyPortalPermission(profile, permissions) {
    return permissions.some((permission) => hasPortalPermission(profile, permission));
}
/**
 * @param {PortalPermissionProfile} profile
 * @returns {AdminTabValue[]}
 */
export function getAllowedAdminTabs(profile) {
    const allowed = [];
    for (const [tab, permission] of Object.entries(ADMIN_TAB_PERMISSION)) {
        if (hasPortalPermission(profile, permission)) {
            allowed.push(tab);
        }
    }
    return allowed;
}
