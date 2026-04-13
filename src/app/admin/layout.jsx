import { AdminLayoutShell } from '@/components/admin/AdminLayoutShell';
import { requireAdminSnapshot } from '@/lib/auth/snapshot';

export default async function AdminLayout({ children }) {
  await requireAdminSnapshot();

  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
