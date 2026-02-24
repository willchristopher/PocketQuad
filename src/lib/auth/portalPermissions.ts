export const ADMIN_ACCESS_LEVELS = [
  'OWNER',
  'IT_ADMIN',
  'CLUB_PRESIDENT',
  'CONTENT_MANAGER',
] as const

export type AdminAccessLevel = (typeof ADMIN_ACCESS_LEVELS)[number]

export const PORTAL_PERMISSIONS = [
  'ADMIN_PORTAL_ACCESS',
  'ADMIN_TAB_OVERVIEW',
  'ADMIN_TAB_UNIVERSITIES',
  'ADMIN_TAB_FACULTY',
  'ADMIN_TAB_BUILDINGS',
  'ADMIN_TAB_BUILDING_IMPORT',
  'ADMIN_TAB_LINKS',
  'ADMIN_TAB_SERVICES',
  'ADMIN_TAB_CLUBS',
  'ADMIN_TAB_EVENTS',
  'ADMIN_TAB_IT_ACCOUNTS',
  'CAN_PUBLISH_ANNOUNCEMENTS',
  'CAN_MANAGE_CLUB_PROFILE',
  'CAN_MANAGE_CLUB_CONTACT',
] as const

export type PortalPermission = (typeof PORTAL_PERMISSIONS)[number]

export type AppRole = 'STUDENT' | 'FACULTY' | 'ADMIN'

export type PortalPermissionProfile = {
  role: AppRole
  adminAccessLevel?: AdminAccessLevel | null
  portalPermissions?: PortalPermission[] | null
  canPublishCampusAnnouncements?: boolean
}

export type AdminTabValue =
  | 'overview'
  | 'universities'
  | 'faculty'
  | 'buildings'
  | 'building-import'
  | 'links'
  | 'services'
  | 'clubs'
  | 'events'
  | 'it-accounts'

export const ADMIN_TAB_PERMISSION: Record<AdminTabValue, PortalPermission> = {
  overview: 'ADMIN_TAB_OVERVIEW',
  universities: 'ADMIN_TAB_UNIVERSITIES',
  faculty: 'ADMIN_TAB_FACULTY',
  buildings: 'ADMIN_TAB_BUILDINGS',
  'building-import': 'ADMIN_TAB_BUILDING_IMPORT',
  links: 'ADMIN_TAB_LINKS',
  services: 'ADMIN_TAB_SERVICES',
  clubs: 'ADMIN_TAB_CLUBS',
  events: 'ADMIN_TAB_EVENTS',
  'it-accounts': 'ADMIN_TAB_IT_ACCOUNTS',
}

const OWNER_PERMISSIONS: PortalPermission[] = [
  'ADMIN_PORTAL_ACCESS',
  'ADMIN_TAB_OVERVIEW',
  'ADMIN_TAB_UNIVERSITIES',
  'ADMIN_TAB_FACULTY',
  'ADMIN_TAB_BUILDINGS',
  'ADMIN_TAB_BUILDING_IMPORT',
  'ADMIN_TAB_LINKS',
  'ADMIN_TAB_SERVICES',
  'ADMIN_TAB_CLUBS',
  'ADMIN_TAB_EVENTS',
  'ADMIN_TAB_IT_ACCOUNTS',
  'CAN_PUBLISH_ANNOUNCEMENTS',
  'CAN_MANAGE_CLUB_PROFILE',
  'CAN_MANAGE_CLUB_CONTACT',
]

const IT_ADMIN_PERMISSIONS: PortalPermission[] = [
  'ADMIN_PORTAL_ACCESS',
  'ADMIN_TAB_OVERVIEW',
  'ADMIN_TAB_FACULTY',
  'ADMIN_TAB_BUILDINGS',
  'ADMIN_TAB_BUILDING_IMPORT',
  'ADMIN_TAB_LINKS',
  'ADMIN_TAB_SERVICES',
  'ADMIN_TAB_EVENTS',
]

const CLUB_PRESIDENT_PERMISSIONS: PortalPermission[] = [
  'ADMIN_PORTAL_ACCESS',
  'ADMIN_TAB_OVERVIEW',
  'ADMIN_TAB_CLUBS',
  'ADMIN_TAB_EVENTS',
  'CAN_PUBLISH_ANNOUNCEMENTS',
  'CAN_MANAGE_CLUB_PROFILE',
  'CAN_MANAGE_CLUB_CONTACT',
]

const CONTENT_MANAGER_PERMISSIONS: PortalPermission[] = [
  'ADMIN_PORTAL_ACCESS',
  'ADMIN_TAB_OVERVIEW',
  'ADMIN_TAB_LINKS',
  'ADMIN_TAB_SERVICES',
  'ADMIN_TAB_EVENTS',
  'CAN_PUBLISH_ANNOUNCEMENTS',
]

export function getDefaultPermissionsForAccessLevel(
  level: AdminAccessLevel,
): PortalPermission[] {
  if (level === 'OWNER') return OWNER_PERMISSIONS
  if (level === 'IT_ADMIN') return IT_ADMIN_PERMISSIONS
  if (level === 'CLUB_PRESIDENT') return CLUB_PRESIDENT_PERMISSIONS
  return CONTENT_MANAGER_PERMISSIONS
}

export function dedupePermissions(
  permissions: Iterable<PortalPermission | null | undefined>,
) {
  const unique = new Set<PortalPermission>()
  for (const permission of permissions) {
    if (permission) unique.add(permission)
  }
  return Array.from(unique)
}

export function resolvePortalPermissions(
  profile: PortalPermissionProfile,
): PortalPermission[] {
  const seed = profile.portalPermissions ?? []

  const effectiveAccessLevel: AdminAccessLevel | null =
    profile.adminAccessLevel ??
    (profile.role === 'ADMIN' ? 'OWNER' : null)

  const levelPermissions = effectiveAccessLevel
    ? getDefaultPermissionsForAccessLevel(effectiveAccessLevel)
    : []

  const permissions = dedupePermissions([...seed, ...levelPermissions])

  if (profile.canPublishCampusAnnouncements) {
    permissions.push('CAN_PUBLISH_ANNOUNCEMENTS')
  }

  if (profile.role === 'ADMIN' && !permissions.includes('ADMIN_PORTAL_ACCESS')) {
    permissions.push('ADMIN_PORTAL_ACCESS')
  }

  return dedupePermissions(permissions)
}

export function canAccessAdminPortal(profile: PortalPermissionProfile) {
  if (profile.role === 'ADMIN') return true
  const permissions = resolvePortalPermissions(profile)
  return permissions.includes('ADMIN_PORTAL_ACCESS')
}

export function hasPortalPermission(
  profile: PortalPermissionProfile,
  permission: PortalPermission,
) {
  if (profile.role === 'ADMIN' && profile.adminAccessLevel == null) {
    return true
  }

  const permissions = resolvePortalPermissions(profile)
  return permissions.includes(permission)
}

export function hasAnyPortalPermission(
  profile: PortalPermissionProfile,
  permissions: PortalPermission[],
) {
  return permissions.some((permission) => hasPortalPermission(profile, permission))
}

export function getAllowedAdminTabs(profile: PortalPermissionProfile) {
  const allowed: AdminTabValue[] = []

  for (const [tab, permission] of Object.entries(ADMIN_TAB_PERMISSION) as Array<
    [AdminTabValue, PortalPermission]
  >) {
    if (hasPortalPermission(profile, permission)) {
      allowed.push(tab)
    }
  }

  return allowed
}
