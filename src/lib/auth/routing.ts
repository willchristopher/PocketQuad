import {
  canAccessAdminPortal,
  type AdminAccessLevel,
  type AppRole,
  type PortalPermission,
} from '@/lib/auth/portalPermissions'

type HomeRouteProfile = {
  role: AppRole
  adminAccessLevel?: AdminAccessLevel | null
  portalPermissions?: PortalPermission[] | null
  canPublishCampusAnnouncements?: boolean
}

export function getHomeForRole(
  roleOrProfile: AppRole | HomeRouteProfile | undefined | null,
) {
  if (!roleOrProfile) {
    return '/dashboard'
  }

  if (typeof roleOrProfile !== 'string') {
    if (canAccessAdminPortal(roleOrProfile)) return '/admin'
    if (roleOrProfile.role === 'FACULTY') return '/faculty/dashboard'
    return '/dashboard'
  }

  if (roleOrProfile === 'FACULTY') return '/faculty/dashboard'
  if (roleOrProfile === 'ADMIN') return '/admin'
  return '/dashboard'
}

export function getSafeRedirectTarget(value: string | null) {
  if (!value) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  return value
}
