export const TEST_AUTH_COOKIE_NAME = 'pocketquad-test-role';

export const TEST_AUTH_IDENTITIES = {
  STUDENT: {
    cookieValue: 'student',
    email: 'e2e.student@pocketquad.test',
    supabaseId: 'e2e-student-supabase-id',
  },
  FACULTY: {
    cookieValue: 'faculty',
    email: 'e2e.faculty@pocketquad.test',
    supabaseId: 'e2e-faculty-supabase-id',
  },
  ADMIN: {
    cookieValue: 'admin',
    email: 'e2e.admin@pocketquad.test',
    supabaseId: 'e2e-admin-supabase-id',
  },
};

export function isTestingAuthEnabled() {
  return process.env.E2E_TESTING === 'true' && process.env.NODE_ENV !== 'production';
}

export function parseTestingRole(value) {
  if (!isTestingAuthEnabled() || !value) {
    return null;
  }

  const normalized = value.toLowerCase();
  const entry = Object.entries(TEST_AUTH_IDENTITIES).find(([, identity]) => identity.cookieValue === normalized);

  return entry?.[0] ?? null;
}

export function getTestingIdentity(role) {
  return TEST_AUTH_IDENTITIES[role] ?? null;
}

export function createTestingSupabaseUser(role) {
  const identity = getTestingIdentity(role);

  if (!identity) {
    return null;
  }

  return {
    id: identity.supabaseId,
    email: identity.email,
    email_confirmed_at: new Date(0).toISOString(),
    app_metadata: {
      provider: 'e2e',
      providers: ['e2e'],
    },
    user_metadata: {
      role,
    },
  };
}
