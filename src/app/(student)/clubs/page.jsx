import ClubhousePage from '@/components/clubs/ClubhousePage';
import { requireStudentSnapshot } from '@/lib/auth/snapshot';
import { getClubsCached } from '@/lib/server/universityData';

export default async function ClubsPage() {
  const { profile } = await requireStudentSnapshot();
  const initialClubs = await getClubsCached(profile.universityId ?? undefined, undefined, undefined);

  return <ClubhousePage initialClubs={initialClubs} />;
}
