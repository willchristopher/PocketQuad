import { FacultyAnnouncements } from '@/components/faculty/FacultyAnnouncements';
import { requireFacultySnapshot } from '@/lib/auth/snapshot';
import { getFacultyAnnouncementsData } from '@/lib/server/facultyWorkspace';

export default async function FacultyAnnouncementsPage() {
  const { profile } = await requireFacultySnapshot();
  const initialState = await getFacultyAnnouncementsData(profile);

  return <FacultyAnnouncements initialState={initialState} />;
}
