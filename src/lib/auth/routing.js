import { canAccessAdminPortal, } from '@/lib/auth/portalPermissions';
export function getHomeForRole(roleOrProfile) {
    if (!roleOrProfile) {
        return '/dashboard';
    }
    if (typeof roleOrProfile !== 'string') {
        if (canAccessAdminPortal(roleOrProfile))
            return '/admin';
        if (roleOrProfile.role === 'FACULTY')
            return '/faculty/dashboard';
        return '/dashboard';
    }
    if (roleOrProfile === 'FACULTY')
        return '/faculty/dashboard';
    if (roleOrProfile === 'ADMIN')
        return '/admin';
    return '/dashboard';
}
export function getSafeRedirectTarget(value) {
    if (!value)
        return null;
    if (!value.startsWith('/'))
        return null;
    if (value.startsWith('//'))
        return null;
    return value;
}
