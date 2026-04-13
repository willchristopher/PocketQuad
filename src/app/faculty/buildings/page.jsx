import { FacultyBuildings } from '@/components/faculty/FacultyBuildings';
import { requireFacultySnapshot } from '@/lib/auth/snapshot';
import { getFacultyBuildingsData } from '@/lib/server/facultyWorkspace';

export default async function FacultyBuildingsPage() {
  const { profile } = await requireFacultySnapshot();
  const initialData = await getFacultyBuildingsData(profile);

  return <FacultyBuildings initialData={initialData} />;
}
