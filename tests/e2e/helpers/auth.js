export const TEST_AUTH_COOKIE_NAME = 'pocketquad-test-role';

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';

export function getBaseURL() {
  return process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_BASE_URL;
}

export async function signInAs(page, role) {
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: TEST_AUTH_COOKIE_NAME,
      value: role,
      url: getBaseURL(),
      sameSite: 'Lax',
    },
  ]);
}

export async function clearTestAuth(page) {
  await page.context().clearCookies();
}
