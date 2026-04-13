import { FacultyEvents } from '@/components/faculty/FacultyEvents';
import { requireFacultySnapshot } from '@/lib/auth/snapshot';
import { getFacultyEventsData, getFacultyWorkspaceData } from '@/lib/server/facultyWorkspace';

export default async function FacultyEventsPage() {
  const { profile } = await requireFacultySnapshot();
  const [initialWorkspace, initialEvents] = await Promise.all([
    getFacultyWorkspaceData(profile),
    getFacultyEventsData(profile),
  ]);

  return <FacultyEvents initialWorkspace={initialWorkspace} initialEvents={initialEvents} />;
}
