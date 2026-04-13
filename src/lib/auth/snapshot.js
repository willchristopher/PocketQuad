import { cache } from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { canAccessAdminPortal } from '@/lib/auth/portalPermissions';
import { getHomeForRole } from '@/lib/auth/routing';
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

async function readAuthSnapshot() {
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

  const profile = await prisma.user.findFirst({
    where,
    select: AUTH_SNAPSHOT_PROFILE_SELECT,
  });

  if (!profile) {
    return {
      session: null,
      user: data.user,
      profile: null,
    };
  }

  const unreadNotificationCount = await prisma.notification.count({
    where: {
      userId: profile.id,
      read: false,
      clearedAt: null,
    },
  });

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

export const getServerAuthSnapshot = cache(readAuthSnapshot);

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
