import {
  hasPortalPermission,
  type AdminAccessLevel,
  type PortalPermission,
} from '@/lib/auth/portalPermissions'

type PermissionProfile = {
  role: 'STUDENT' | 'FACULTY' | 'ADMIN'
  adminAccessLevel?: AdminAccessLevel | null
  portalPermissions?: PortalPermission[] | null
  canPublishCampusAnnouncements: boolean
  managedBuildings?: Array<{
    buildingId: string
  }> | null
}

export function canPublishCampusAnnouncements(profile: PermissionProfile) {
  return hasPortalPermission(profile, 'CAN_PUBLISH_ANNOUNCEMENTS')
}

export function canManageBuilding(profile: PermissionProfile, buildingId: string) {
  return (
    hasPortalPermission(profile, 'ADMIN_TAB_BUILDINGS') ||
    (profile.managedBuildings ?? []).some((assignment) => assignment.buildingId === buildingId)
  )
}
