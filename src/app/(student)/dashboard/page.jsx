import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { requireStudentSnapshot } from '@/lib/auth/snapshot';
import { getDashboardOverview } from '@/lib/server/dashboardOverview';

export default async function DashboardPage() {
  const { profile } = await requireStudentSnapshot();
  const initialOverview = await getDashboardOverview(profile);

  return <StudentDashboard initialOverview={initialOverview} />;
}
