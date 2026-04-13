import { ApiError } from '@/lib/api/utils';
import { prisma } from '@/lib/prisma';

export const ACTIVE_ACCOUNT_STATUS = 'ACTIVE';
export const DORMANT_ACCOUNT_STATUS = 'DORMANT';

function normalizeEmail(email) {
  return email?.trim().toLowerCase() ?? '';
}

export function getDormantAccountDisplayName(account) {
  if (!account) {
    return '';
  }

  const explicitDisplayName = account.displayName?.trim();
  if (explicitDisplayName) {
    return explicitDisplayName;
  }

  const fallbackName = [account.firstName, account.lastName].filter(Boolean).join(' ').trim();
  return fallbackName || account.email;
}

export function getAccountStatus(user) {
  if (!user) {
    return ACTIVE_ACCOUNT_STATUS;
  }

  const hasPortalAccess =
    user.role === 'ADMIN' ||
    user.adminAccessLevel != null ||
    (Array.isArray(user.portalPermissions) && user.portalPermissions.length > 0);

  return !hasPortalAccess && !user.lastLogin && !user.onboardingComplete
    ? DORMANT_ACCOUNT_STATUS
    : ACTIVE_ACCOUNT_STATUS;
}

export function isDormantUserRecord(user) {
  return getAccountStatus(user) === DORMANT_ACCOUNT_STATUS;
}

export function buildDormantAccountConfirmationMessage(account) {
  return `We found ${getDormantAccountDisplayName(account)} on file for this email. Confirm the matching name to continue.`;
}

export function buildDormantRoleMismatchMessage(account) {
  if (!account) {
    return 'This email is already reserved. Contact support for help.';
  }

  if (account.role === 'FACULTY') {
    return 'This email is already on file for a faculty or staff account. Choose Faculty or contact support.';
  }

  if (account.role === 'STUDENT') {
    return 'This email is already on file for a student account. Choose Student or contact support.';
  }

  return 'This email is already reserved for another account type. Contact support for help.';
}

export async function findDormantAccountByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const account = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
      role: true,
      universityId: true,
      lastLogin: true,
      onboardingComplete: true,
      adminAccessLevel: true,
      portalPermissions: true,
    },
  });

  return isDormantUserRecord(account) ? account : null;
}

export function serializeDormantAccount(account) {
  if (!account) {
    return null;
  }

  return {
    id: account.id,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    displayName: getDormantAccountDisplayName(account),
    role: account.role,
    accountStatus: getAccountStatus(account),
    universityId: account.universityId ?? null,
  };
}

export async function assertDormantAccountMatch({
  email,
  requestedRole,
  dormantAccountId,
}) {
  const dormantAccount = await findDormantAccountByEmail(email);
  if (!dormantAccount) {
    return null;
  }

  if (requestedRole && dormantAccount.role !== requestedRole) {
    throw new ApiError(409, buildDormantRoleMismatchMessage(dormantAccount));
  }

  if (dormantAccountId !== dormantAccount.id) {
    throw new ApiError(409, buildDormantAccountConfirmationMessage(dormantAccount));
  }

  return dormantAccount;
}
