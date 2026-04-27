import { expect, test } from '@playwright/test';
import { signInAs } from './helpers/auth';

test.describe('student smoke', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'student');
  });

  test('opens the student dashboard with seeded widgets', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('E2E Welcome Night')).toBeVisible();
    await expect(page.getByText('E2E Project Checkpoint')).toBeVisible();
    await expect(page.getByText('Dr. E2E Faculty')).toBeVisible();
  });

  test('opens core student pages', async ({ page }) => {
    const pages = [
      { path: '/events', heading: 'Campus Events', text: 'E2E Welcome Night' },
      { path: '/faculty-directory', heading: 'Faculty Directory', text: 'Dr. E2E Faculty' },
      { path: '/campus-map', heading: 'Campus Map', text: 'E2E Library' },
      { path: '/clubs', heading: 'Clubhouse', text: 'E2E Outdoor Club' },
      { path: '/profile', heading: 'Profile & Preferences', text: 'e2e.student@pocketquad.test' },
    ];

    for (const pageConfig of pages) {
      await page.goto(pageConfig.path);
      await expect(page.getByRole('heading', { name: pageConfig.heading })).toBeVisible();
      await expect(page.getByText(pageConfig.text).first()).toBeVisible();
    }
  });
});
