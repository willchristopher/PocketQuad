import { prisma } from '@/lib/prisma';
import { hasPortalPermission } from '@/lib/auth/portalPermissions';
import { requireAdminSnapshot } from '@/lib/auth/snapshot';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
export default async function AdminPage() {
    const { profile } = await requireAdminSnapshot();
    const initialUniversities = hasPortalPermission(profile, 'ADMIN_TAB_UNIVERSITIES')
        ? await prisma.university.findMany({
            include: {
                _count: {
                    select: {
                        users: true,
                        faculties: true,
                        events: true,
                        buildings: true,
                        resourceLinks: true,
                        services: true,
                        clubs: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        })
        : null;
    return <AdminDashboard initialUniversities={initialUniversities} />;
}
