import { FacultyLayoutShell } from '@/components/faculty/FacultyLayoutShell';
import { requireFacultySnapshot } from '@/lib/auth/snapshot';

export default async function FacultyLayout({ children }) {
  await requireFacultySnapshot();

  return <FacultyLayoutShell>{children}</FacultyLayoutShell>;
}
