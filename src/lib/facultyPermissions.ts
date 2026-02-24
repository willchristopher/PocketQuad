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
}

export function canPublishCampusAnnouncements(profile: PermissionProfile) {
  return hasPortalPermission(profile, 'CAN_PUBLISH_ANNOUNCEMENTS')
}
