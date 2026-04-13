import { prisma } from '@/lib/prisma';
import { requireStudentSnapshot } from '@/lib/auth/snapshot';
import { NotificationsPage } from '@/components/notifications/NotificationsPage';

export default async function StudentNotificationsPage() {
  const { profile } = await requireStudentSnapshot();
  const limit = 100;
  const where = {
    userId: profile.id,
    clearedAt: null,
  };

  const [items, unreadCount, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({
      where: {
        ...where,
        read: false,
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return (
    <NotificationsPage
      initialData={{
        items,
        unreadCount,
        page: 1,
        limit,
        total,
        hasMore: total > limit,
      }}
    />
  );
}
