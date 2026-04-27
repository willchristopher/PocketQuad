import { expect, test } from '@playwright/test';
import { signInAs } from './helpers/auth';

test.describe('admin smoke', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'admin');
  });

  test('opens the admin dashboard with seeded university data', async ({ page }) => {
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText('PocketQuad E2E University')).toBeVisible();
    await expect(page.getByText('Faculty')).toBeVisible();
    await expect(page.getByText('Clubs')).toBeVisible();
    await expect(page.getByText('Events')).toBeVisible();
  });
});
