# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> protected route access >> keeps faculty users out of student and admin pages
- Location: tests/e2e/auth.spec.js:64:7

# Error details

```
Error: page.goto: net::ERR_ABORTED at http://127.0.0.1:3000/admin
Call log:
  - navigating to "http://127.0.0.1:3000/admin", waiting until "load"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - main [ref=e3]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]:
            - generic [ref=e8]:
              - img [ref=e9]
              - generic [ref=e14]: PocketQuad
            - button "Log out" [ref=e15] [cursor=pointer]:
              - img [ref=e16]
              - generic [ref=e19]: Log out
          - heading "Good morning, E2E." [level=1] [ref=e20]
          - paragraph [ref=e21]: What would you like to do today?
        - navigation "Quick actions" [ref=e22]:
          - list [ref=e23]:
            - listitem [ref=e24]:
              - link "Change office hours Update your weekly schedule and availability status." [ref=e25] [cursor=pointer]:
                - /url: /faculty/office-hours
                - img [ref=e27]
                - generic [ref=e30]:
                  - paragraph [ref=e31]: Change office hours
                  - paragraph [ref=e32]: Update your weekly schedule and availability status.
                - img [ref=e33]
            - listitem [ref=e35]:
              - link "Create or change an event Publish workshops, sessions, and student-facing events." [ref=e36] [cursor=pointer]:
                - /url: /faculty/events
                - img [ref=e38]
                - generic [ref=e40]:
                  - paragraph [ref=e41]: Create or change an event
                  - paragraph [ref=e42]: Publish workshops, sessions, and student-facing events.
                - img [ref=e43]
            - listitem [ref=e45]:
              - link "Publish an announcement Send campus, building, or service updates to students." [ref=e46] [cursor=pointer]:
                - /url: /faculty/announcements
                - img [ref=e48]
                - generic [ref=e51]:
                  - paragraph [ref=e52]: Publish an announcement
                  - paragraph [ref=e53]: Send campus, building, or service updates to students.
                - img [ref=e54]
            - listitem [ref=e56]:
              - link "Change building status Update hours, operational status, and accessibility notes." [ref=e57] [cursor=pointer]:
                - /url: /faculty/buildings
                - img [ref=e59]
                - generic [ref=e63]:
                  - paragraph [ref=e64]: Change building status
                  - paragraph [ref=e65]: Update hours, operational status, and accessibility notes.
                - img [ref=e66]
    - navigation "Faculty navigation" [ref=e68]:
      - generic [ref=e69]:
        - link "Hours" [ref=e70] [cursor=pointer]:
          - /url: /faculty/office-hours
          - img [ref=e71]
          - generic [ref=e74]: Hours
        - link "Events" [ref=e75] [cursor=pointer]:
          - /url: /faculty/events
          - img [ref=e76]
          - generic [ref=e78]: Events
        - link "Announce" [ref=e79] [cursor=pointer]:
          - /url: /faculty/announcements
          - img [ref=e80]
          - generic [ref=e83]: Announce
        - link "Buildings" [ref=e84] [cursor=pointer]:
          - /url: /faculty/buildings
          - img [ref=e85]
          - generic [ref=e89]: Buildings
        - link "Settings" [ref=e90] [cursor=pointer]:
          - /url: /faculty/settings
          - img [ref=e91]
          - generic [ref=e94]: Settings
  - region "Notifications alt+T"
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
> 70 |     await page.goto('/admin');
     |                ^ Error: page.goto: net::ERR_ABORTED at http://127.0.0.1:3000/admin
  71 |     await expect(page).toHaveURL(/\/faculty\/dashboard$/);
  72 |   });
  73 | 
  74 |   test('allows admin users into the admin dashboard', async ({ page }) => {
  75 |     await signInAs(page, 'admin');
  76 |     await page.goto('/admin');
  77 | 
  78 |     await expect(page).toHaveURL(/\/admin$/);
  79 |     await expect(page.getByText('PocketQuad E2E University')).toBeVisible();
  80 |   });
  81 | });
  82 | 
```