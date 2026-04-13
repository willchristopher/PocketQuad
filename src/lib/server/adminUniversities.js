import { prisma } from '@/lib/prisma';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';

const universityCountSelect = {
  users: true,
  faculties: true,
  events: true,
  buildings: true,
  resourceLinks: true,
  services: true,
  clubs: true,
};

const adminUniversitySelect = {
  id: true,
  name: true,
  slug: true,
  domain: true,
  themeMainColor: true,
  themeAccentColor: true,
  disabledStudentPages: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: universityCountSelect,
  },
};

const legacyAdminUniversitySelect = {
  id: true,
  name: true,
  slug: true,
  domain: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: universityCountSelect,
  },
};

function withUniversityCompatibility(university) {
  return {
    ...university,
    themeMainColor:
      'themeMainColor' in university ? university.themeMainColor ?? null : null,
    themeAccentColor:
      'themeAccentColor' in university ? university.themeAccentColor ?? null : null,
    disabledStudentPages:
      'disabledStudentPages' in university
        ? university.disabledStudentPages ?? []
        : [],
  };
}

export async function listAdminUniversitiesCompatible() {
  try {
    const universities = await prisma.university.findMany({
      select: adminUniversitySelect,
      orderBy: { name: 'asc' },
    });
    return universities.map((university) => withUniversityCompatibility(university));
  } catch (error) {
    if (!isPrismaSchemaCompatibilityError(error)) {
      throw error;
    }
    const universities = await prisma.university.findMany({
      select: legacyAdminUniversitySelect,
      orderBy: { name: 'asc' },
    });
    return universities.map((university) => withUniversityCompatibility(university));
  }
}
