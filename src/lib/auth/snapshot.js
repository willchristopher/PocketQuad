import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { canAccessAdminPortal } from '@/lib/auth/portalPermissions';
import { getHomeForRole } from '@/lib/auth/routing';
import { isPrismaSchemaCompatibilityError } from '@/lib/server/dbCompatibility';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const AUTH_SNAPSHOT_PROFILE_SELECT = {
  id: true,
  supabaseId: true,
  universityId: true,
  email: true,
  displayName: true,
  firstName: true,
  lastName: true,
  avatar: true,
  role: true,
  emailVerified: true,
  onboardingComplete: true,
  canPublishCampusAnnouncements: true,
  adminAccessLevel: true,
  portalPermissions: true,
  managedClubs: {
    select: {
      clubId: true,
      club: {
        select: {
          id: true,
          universityId: true,
          name: true,
        },
      },
    },
  },
  notificationPreferences: {
    select: {
      theme: true,
      resourceLinkIds: true,
      dashboardModules: true,
    },
  },
  university: {
    select: {
      id: true,
      name: true,
      domain: true,
      disabledStudentPages: true,
      themeMainColor: true,
      themeAccentColor: true,
    },
  },
};

const AUTH_SNAPSHOT_PROFILE_SELECT_LEGACY = {
  id: true,
  supabaseId: true,
  universityId: true,
  email: true,
  displayName: true,
  firstName: true,
  lastName: true,
  avatar: true,
  role: true,
  emailVerified: true,
  onboardingComplete: true,
  canPublishCampusAnnouncements: true,
};

async function countUnreadNotificationsCompatible(userId) {
  try {
    return await prisma.notification.count({
      where: {
        userId,
        read: false,
        clearedAt: null,
      },
    });
  } catch (error) {
    if (!isPrismaSchemaCompatibilityError(error)) {
      throw error;
    }
    return prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }
}

async function readAuthSnapshot() {
  noStore();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      session: null,
      user: null,
      profile: null,
    };
  }

  const normalizedEmail = data.user.email?.toLowerCase();
  const where = normalizedEmail
    ? {
        OR: [{ supabaseId: data.user.id }, { email: normalizedEmail }],
      }
    : { supabaseId: data.user.id };

  let profile;
  try {
    profile = await prisma.user.findFirst({
      where,
      select: AUTH_SNAPSHOT_PROFILE_SELECT,
    });
  } catch (error) {
    if (!isPrismaSchemaCompatibilityError(error)) {
      throw error;
    }
    const legacyProfile = await prisma.user.findFirst({
      where,
      select: AUTH_SNAPSHOT_PROFILE_SELECT_LEGACY,
    });
    profile = legacyProfile
      ? {
          ...legacyProfile,
          adminAccessLevel: null,
          portalPermissions: [],
          managedClubs: [],
          notificationPreferences: null,
          university: null,
        }
      : null;
  }

  if (!profile) {
    return {
      session: null,
      user: data.user,
      profile: null,
    };
  }

  const unreadNotificationCount = await countUnreadNotificationsCompatible(profile.id);

  return {
    session: {
      user: {
        id: data.user.id,
        email: data.user.email ?? null,
      },
    },
    user: data.user,
    profile: {
      ...profile,
      unreadNotificationCount,
    },
  };
}

export async function getServerAuthSnapshot() {
  return readAuthSnapshot();
}

export function getRoleDestination(profile) {
  return getHomeForRole(profile);
}

export async function requireAuthenticatedSnapshot() {
  const snapshot = await getServerAuthSnapshot();

  if (!snapshot.user || !snapshot.profile) {
    redirect('/login');
  }

  if (!snapshot.profile.emailVerified) {
    redirect('/verify-email');
  }

  return snapshot;
}

export async function requireStudentSnapshot() {
  const snapshot = await requireAuthenticatedSnapshot();
  const { profile } = snapshot;

  if (canAccessAdminPortal(profile)) {
    redirect('/admin');
  }

  if (profile.role === 'FACULTY') {
    redirect('/faculty/dashboard');
  }

  return snapshot;
}

export async function requireFacultySnapshot() {
  const snapshot = await requireAuthenticatedSnapshot();
  const { profile } = snapshot;

  if (profile.role !== 'FACULTY' && !canAccessAdminPortal(profile)) {
    redirect('/dashboard');
  }

  return snapshot;
}

export async function requireAdminSnapshot() {
  const snapshot = await requireAuthenticatedSnapshot();

  if (!canAccessAdminPortal(snapshot.profile)) {
    redirect(getRoleDestination(snapshot.profile));
  }

  return snapshot;
}
