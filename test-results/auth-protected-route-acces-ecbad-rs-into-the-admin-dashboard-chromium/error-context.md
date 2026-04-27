# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> protected route access >> allows admin users into the admin dashboard
- Location: tests/e2e/auth.spec.js:74:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('PocketQuad E2E University')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('PocketQuad E2E University')
    9 × locator resolved to <option value="e2e-university">PocketQuad E2E University</option>
      - unexpected value "hidden"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - link "PocketQuad Admin" [ref=e5] [cursor=pointer]:
          - /url: /admin?tab=overview
          - img [ref=e7]
          - generic [ref=e10]:
            - paragraph [ref=e11]: PocketQuad
            - paragraph [ref=e12]: Admin
        - generic [ref=e13]: OWNER
      - navigation [ref=e14]:
        - link "Overview" [ref=e15] [cursor=pointer]:
          - /url: /admin?tab=overview
          - img [ref=e17]
          - generic [ref=e22]: Overview
        - link "Student Pages" [ref=e23] [cursor=pointer]:
          - /url: /admin?tab=student-pages
          - img [ref=e24]
          - generic [ref=e29]: Student Pages
        - link "Faculty" [ref=e30] [cursor=pointer]:
          - /url: /admin?tab=faculty
          - img [ref=e31]
          - generic [ref=e43]: Faculty
        - link "Buildings" [ref=e44] [cursor=pointer]:
          - /url: /admin?tab=buildings
          - img [ref=e45]
          - generic [ref=e49]: Buildings
        - link "Resource Links" [ref=e50] [cursor=pointer]:
          - /url: /admin?tab=links
          - img [ref=e51]
          - generic [ref=e55]: Resource Links
        - link "Clubs" [ref=e56] [cursor=pointer]:
          - /url: /admin?tab=clubs
          - img [ref=e57]
          - generic [ref=e59]: Clubs
        - link "Events" [ref=e60] [cursor=pointer]:
          - /url: /admin?tab=events
          - img [ref=e61]
          - generic [ref=e63]: Events
        - link "IT Accounts" [ref=e64] [cursor=pointer]:
          - /url: /admin?tab=it-accounts
          - img [ref=e65]
          - generic [ref=e69]: IT Accounts
        - link "Users" [ref=e70] [cursor=pointer]:
          - /url: /admin?tab=users
          - img [ref=e71]
          - generic [ref=e76]: Users
      - generic [ref=e77]:
        - generic [ref=e78]:
          - paragraph [ref=e79]: Signed in as
          - paragraph [ref=e80]: e2e.admin@pocketquad.test
        - button "Change university" [disabled]:
          - img
          - text: Change university
        - button "Log out" [ref=e81] [cursor=pointer]:
          - img [ref=e82]
          - text: Log out
    - generic [ref=e85]:
      - banner [ref=e86]:
        - generic [ref=e88]:
          - heading "Overview" [level=1] [ref=e89]
          - paragraph [ref=e90]: Monitor university data coverage and content health.
        - button "Switch to dark mode" [ref=e92] [cursor=pointer]:
          - img [ref=e93]
      - main [ref=e99]:
        - generic [ref=e101]:
          - generic [ref=e102]:
            - heading "What university are you working on?" [level=3] [ref=e103]
            - paragraph [ref=e104]: Select one university to load a scoped dashboard and run CRUD operations for that tenant only.
          - generic [ref=e106]:
            - generic [ref=e107]:
              - text: University
              - combobox "University" [ref=e108]:
                - option "Select university" [selected]
                - option "Murray State University"
                - option "North Valley University"
                - option "PocketQuad E2E University"
            - button "Load Dashboard" [disabled]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e114] [cursor=pointer]:
    - img [ref=e115]
  - alert [ref=e118]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { clearTestAuth, signInAs } from './helpers/auth';
  3  | 
  4  | test.describe('public auth screens', () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await clearTestAuth(page);
  7  |   });
  8  | 
  9  |   test('redirects the root route to login', async ({ page }) => {
  10 |     await page.goto('/');
  11 | 
  12 |     await expect(page).toHaveURL(/\/login$/);
  13 |     await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  14 |   });
  15 | 
  16 |   test('renders login, register, and forgot password form controls', async ({ page }) => {
  17 |     await page.goto('/login');
  18 |     await expect(page.getByLabel('Email')).toBeVisible();
  19 |     await expect(page.getByLabel('Password')).toBeVisible();
  20 | 
  21 |     await page.goto('/register');
  22 |     await expect(page.getByLabel('First Name')).toBeVisible();
  23 |     await expect(page.getByLabel('Last Name')).toBeVisible();
  24 |     await expect(page.getByLabel('University Email')).toBeVisible();
  25 | 
  26 |     await page.goto('/forgot-password');
  27 |     await expect(page.getByLabel('University Email')).toBeVisible();
  28 |   });
  29 | 
  30 |   test('shows an error for invalid login without leaving login', async ({ page }) => {
  31 |     await page.goto('/login');
  32 |     await page.getByLabel('Email').fill('nobody@pocketquad.test');
  33 |     await page.getByLabel('Password').fill('not-a-real-password');
  34 |     await page.getByRole('button', { name: /sign in/i }).click();
  35 | 
  36 |     await expect(page).toHaveURL(/\/login$/);
  37 |     await expect(page.getByText('Invalid credentials')).toBeVisible();
  38 |   });
  39 | });
  40 | 
  41 | test.describe('protected route access', () => {
  42 |   test.beforeEach(async ({ page }) => {
  43 |     await clearTestAuth(page);
  44 |   });
  45 | 
  46 |   for (const route of ['/dashboard', '/faculty', '/admin']) {
  47 |     test(`redirects unauthenticated visitors from ${route}`, async ({ page }) => {
  48 |       await page.goto(route);
  49 | 
  50 |       await expect(page).toHaveURL(new RegExp(`/login\\?redirect=${encodeURIComponent(route)}$`));
  51 |     });
  52 |   }
  53 | 
  54 |   test('keeps student users out of faculty and admin pages', async ({ page }) => {
  55 |     await signInAs(page, 'student');
  56 | 
  57 |     await page.goto('/faculty');
  58 |     await expect(page).toHaveURL(/\/dashboard$/);
  59 | 
  60 |     await page.goto('/admin');
  61 |     await expect(page).toHaveURL(/\/dashboard$/);
  62 |   });
  63 | 
  64 |   test('keeps faculty users out of student and admin pages', async ({ page }) => {
  65 |     await signInAs(page, 'faculty');
  66 | 
  67 |     await page.goto('/dashboard');
  68 |     await expect(page).toHaveURL(/\/faculty\/dashboard$/);
  69 | 
  70 |     await page.goto('/admin');
  71 |     await expect(page).toHaveURL(/\/faculty\/dashboard$/);
  72 |   });
  73 | 
  74 |   test('allows admin users into the admin dashboard', async ({ page }) => {
  75 |     await signInAs(page, 'admin');
  76 |     await page.goto('/admin');
  77 | 
  78 |     await expect(page).toHaveURL(/\/admin$/);
> 79 |     await expect(page.getByText('PocketQuad E2E University')).toBeVisible();
     |                                                               ^ Error: expect(locator).toBeVisible() failed
  80 |   });
  81 | });
  82 | 
```