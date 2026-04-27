import { expect, test } from '@playwright/test';
import { clearTestAuth, signInAs } from './helpers/auth';

test.describe('public auth screens', () => {
  test.beforeEach(async ({ page }) => {
    await clearTestAuth(page);
  });

  test('redirects the root route to login', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('renders login, register, and forgot password form controls', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    await page.goto('/register');
    await expect(page.getByLabel('First Name')).toBeVisible();
    await expect(page.getByLabel('Last Name')).toBeVisible();
    await expect(page.getByLabel('University Email')).toBeVisible();

    await page.goto('/forgot-password');
    await expect(page.getByLabel('University Email')).toBeVisible();
  });

  test('shows an error for invalid login without leaving login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@pocketquad.test');
    await page.getByLabel('Password').fill('not-a-real-password');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});

test.describe('protected route access', () => {
  test.beforeEach(async ({ page }) => {
    await clearTestAuth(page);
  });

  for (const route of ['/dashboard', '/faculty', '/admin']) {
    test(`redirects unauthenticated visitors from ${route}`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL(new RegExp(`/login\\?redirect=${encodeURIComponent(route)}$`));
    });
  }

  test('keeps student users out of faculty and admin pages', async ({ page }) => {
    await signInAs(page, 'student');

    await page.goto('/faculty');
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('keeps faculty users out of student and admin pages', async ({ page }) => {
    await signInAs(page, 'faculty');

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/faculty\/dashboard$/);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/faculty\/dashboard$/);
  });

  test('allows admin users into the admin dashboard', async ({ page }) => {
    await signInAs(page, 'admin');
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText('PocketQuad E2E University')).toBeVisible();
  });
});
