import { prisma } from '@/lib/prisma';

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export async function purgeExpiredEvents(universityId) {
  const cutoff = startOfToday();

  return prisma.event.deleteMany({
    where: {
      ...(universityId ? { universityId } : {}),
      OR: [
        {
          endDate: {
            not: null,
            lt: cutoff,
          },
        },
        {
          endDate: null,
          date: {
            lt: cutoff,
          },
        },
      ],
    },
  });
}
