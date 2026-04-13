import CampusMapPage from '@/components/campus/CampusMapPage';
import { requireStudentSnapshot } from '@/lib/auth/snapshot';
import { getBuildingCatalogData } from '@/lib/server/buildingCatalog';

export default async function StudentCampusMapPage({ searchParams }) {
  const { profile } = await requireStudentSnapshot();
  const initialSearchQuery = typeof searchParams?.search === 'string' ? searchParams.search.trim() : '';
  const requestedUniversityId = typeof searchParams?.universityId === 'string' ? searchParams.universityId : undefined;
  const initialBuildings = await getBuildingCatalogData(profile, {
    query: initialSearchQuery || undefined,
    requestedUniversityId,
  });

  return (
    <CampusMapPage
      initialBuildings={initialBuildings}
      initialSearchQuery={initialSearchQuery}
      hasInitialData
    />
  );
}
