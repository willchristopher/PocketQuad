import EventsPage from '@/components/events/EventsPage';
import { requireStudentSnapshot } from '@/lib/auth/snapshot';
import { getEventsCatalogData } from '@/lib/server/eventsCatalog';

export default async function StudentEventsPage() {
  const { profile } = await requireStudentSnapshot();
  const initialResponse = await getEventsCatalogData(profile, {
    limit: 100,
    upcoming: true,
    includeMeta: true,
    page: 1,
  });

  return <EventsPage initialResponse={initialResponse} />;
}
