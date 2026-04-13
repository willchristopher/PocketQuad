import { hasPortalPermission } from '@/lib/auth/portalPermissions';
import { requireAdminSnapshot } from '@/lib/auth/snapshot';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { listAdminUniversitiesCompatible } from '@/lib/server/adminUniversities';
export default async function AdminPage() {
    const { profile } = await requireAdminSnapshot();
    const initialUniversities = hasPortalPermission(profile, 'ADMIN_TAB_UNIVERSITIES')
        ? await listAdminUniversitiesCompatible()
        : null;
    return <AdminDashboard initialUniversities={initialUniversities} />;
}
