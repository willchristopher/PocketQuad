import { expect, test } from '@playwright/test';
import { signInAs } from './helpers/auth';

test.describe('faculty smoke', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'faculty');
  });

  test('opens the faculty home workspace', async ({ page }) => {
    await page.goto('/faculty');

    await expect(page.getByRole('heading', { name: /E2E\./ })).toBeVisible();
    await expect(page.getByText('What would you like to do today?')).toBeVisible();
    await expect(page.getByText('Change office hours')).toBeVisible();
  });

  test('opens the faculty profile/settings route', async ({ page }) => {
    await page.goto('/faculty/profile');

    await expect(page).toHaveURL(/\/faculty\/settings$/);
    await expect(page.getByText('e2e.faculty@pocketquad.test')).toBeVisible();
    await expect(page.getByText('Dr. E2E Faculty').first()).toBeVisible();
  });
});
