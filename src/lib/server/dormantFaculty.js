import { prisma } from '@/lib/prisma';
import { isDormantUserRecord } from '@/lib/auth/dormantAccounts';

const DEFAULT_FACULTY_TITLE = 'Faculty / Staff';
const DEFAULT_OFFICE_LOCATION = 'Office location not listed';
const DEFAULT_OFFICE_HOURS = 'Contact via email for office hours.';

function buildFacultyName(user) {
  const explicitDisplayName = user.displayName?.trim();
  if (explicitDisplayName) {
    return explicitDisplayName;
  }

  const fallbackName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return fallbackName || user.email;
}

export async function ensureDormantFacultyProfiles({ universityId } = {}) {
  const users = await prisma.user.findMany({
    where: {
      role: 'FACULTY',
      facultyProfile: null,
      ...(universityId ? { universityId } : {}),
    },
    select: {
      id: true,
      universityId: true,
      email: true,
      displayName: true,
      firstName: true,
      lastName: true,
      department: true,
      bio: true,
      location: true,
      facultyRoleTags: true,
      lastLogin: true,
      onboardingComplete: true,
      adminAccessLevel: true,
      portalPermissions: true,
    },
  });

  const dormantUsers = users.filter((user) => isDormantUserRecord(user));
  if (dormantUsers.length === 0) {
    return 0;
  }

  await prisma.faculty.createMany({
    data: dormantUsers.map((user) => ({
      userId: user.id,
      universityId: user.universityId,
      name: buildFacultyName(user),
      title: DEFAULT_FACULTY_TITLE,
      department: user.department?.trim() || 'General',
      email: user.email,
      officeLocation: user.location?.trim() || DEFAULT_OFFICE_LOCATION,
      officeHours: DEFAULT_OFFICE_HOURS,
      bio: user.bio?.trim() || null,
      courses: [],
      tags: user.facultyRoleTags ?? [],
    })),
    skipDuplicates: true,
  });

  return dormantUsers.length;
}
