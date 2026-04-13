import { FacultyOfficeHours } from '@/components/faculty/FacultyOfficeHours';
import { requireFacultySnapshot } from '@/lib/auth/snapshot';
import { getFacultyOfficeHoursData, getFacultyStatusData } from '@/lib/server/facultyWorkspace';

export default async function OfficeHoursPage() {
  const { profile } = await requireFacultySnapshot();
  const [initialStatusState, initialOfficeHours] = await Promise.all([
    getFacultyStatusData(profile.id),
    getFacultyOfficeHoursData(profile.id),
  ]);

  return (
    <FacultyOfficeHours
      initialStatusState={initialStatusState}
      initialOfficeHours={initialOfficeHours}
    />
  );
}
