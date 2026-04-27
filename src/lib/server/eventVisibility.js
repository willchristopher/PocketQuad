export const MY_STUDENTS_AUDIENCE = 'MY_STUDENTS';

function buildFavoritedFacultyOrganizerWhere(userId) {
  return {
    organizerRef: {
      is: {
        facultyProfile: {
          is: {
            favorites: {
              some: {
                userId,
              },
            },
          },
        },
      },
    },
  };
}

export function buildEventAudienceVisibilityWhere(profile) {
  if (profile?.role === 'ADMIN') {
    return {};
  }

  const userId = profile?.id;
  if (!userId) {
    return {
      audience: {
        not: MY_STUDENTS_AUDIENCE,
      },
    };
  }

  return {
    OR: [
      {
        audience: {
          not: MY_STUDENTS_AUDIENCE,
        },
      },
      {
        audience: MY_STUDENTS_AUDIENCE,
        organizerId: userId,
      },
      {
        audience: MY_STUDENTS_AUDIENCE,
        ...buildFavoritedFacultyOrganizerWhere(userId),
      },
    ],
  };
}

export function canViewEventForAudience(profile, event) {
  if (!event) {
    return false;
  }

  if (profile?.role === 'ADMIN' || event.audience !== MY_STUDENTS_AUDIENCE) {
    return true;
  }

  const userId = profile?.id;
  if (!userId) {
    return false;
  }

  if (event.organizerId === userId) {
    return true;
  }

  const facultyFavorites = event.organizerRef?.facultyProfile?.favorites ?? [];
  return facultyFavorites.some((favorite) => favorite.userId === userId);
}
