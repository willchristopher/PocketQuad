# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student.spec.js >> student smoke >> opens core student pages
- Location: tests/e2e/student.spec.js:18:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Clubhouse' })
Expected: visible
Error: strict mode violation: getByRole('heading', { name: 'Clubhouse' }) resolved to 2 elements:
    1) <h1 class="break-words font-display text-[clamp(1.35rem,5.8vw,2.15rem)] leading-[0.95] text-foreground sm:truncate">Clubhouse</h1> aka getByRole('heading', { name: 'Clubhouse', exact: true })
    2) <h2 class="mt-3 font-display text-4xl leading-none text-foreground md:text-5xl">Welcome to the Clubhouse.</h2> aka getByRole('heading', { name: 'Welcome to the Clubhouse.' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Clubhouse' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - link "Skip to main content" [ref=e3] [cursor=pointer]:
      - /url: "#main-content"
    - navigation "Primary" [ref=e4]:
      - generic [ref=e6]:
        - link "Dashboard" [ref=e7] [cursor=pointer]:
          - /url: /dashboard
          - img [ref=e8]
        - link "Calendar" [ref=e13] [cursor=pointer]:
          - /url: /calendar
          - img [ref=e14]
        - link "Faculty Directory" [ref=e16] [cursor=pointer]:
          - /url: /faculty-directory
          - img [ref=e17]
        - link "Events" [ref=e22] [cursor=pointer]:
          - /url: /events
          - img [ref=e23]
        - link "Campus Map" [ref=e25] [cursor=pointer]:
          - /url: /campus-map
          - img [ref=e26]
        - link "Resources" [ref=e29] [cursor=pointer]:
          - /url: /links-directory
          - img [ref=e30]
        - link "Campus Chat" [ref=e34] [cursor=pointer]:
          - /url: /chatroom
          - img [ref=e35]
        - link "Clubs" [ref=e37] [cursor=pointer]:
          - /url: /clubs
          - img [ref=e38]
        - link "Notifications" [ref=e40] [cursor=pointer]:
          - /url: /notifications
          - img [ref=e41]
        - link "Profile" [ref=e46] [cursor=pointer]:
          - /url: /profile
          - img [ref=e47]
        - button "Log out" [ref=e51] [cursor=pointer]:
          - img [ref=e52]
    - generic [ref=e55]:
      - banner [ref=e56]:
        - generic [ref=e57]:
          - generic [ref=e59]:
            - paragraph [ref=e60]: PocketQuad E2E University
            - heading "Clubhouse" [level=1] [ref=e62]
          - link "Notifications" [ref=e64] [cursor=pointer]:
            - /url: /notifications
            - img [ref=e65]
            - generic [ref=e69]: "1"
      - main [ref=e70]:
        - generic [ref=e75]:
          - paragraph [ref=e76]: Clubhouse
          - heading "Welcome to the Clubhouse." [level=2] [ref=e77]
    - button "Open AI Assistant" [ref=e78] [cursor=pointer]:
      - img [ref=e79]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e87] [cursor=pointer]:
    - img [ref=e88]
  - alert [ref=e91]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { signInAs } from './helpers/auth';
  3  | 
  4  | test.describe('student smoke', () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await signInAs(page, 'student');
  7  |   });
  8  | 
  9  |   test('opens the student dashboard with seeded widgets', async ({ page }) => {
  10 |     await page.goto('/dashboard');
  11 | 
  12 |     await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  13 |     await expect(page.getByText('E2E Welcome Night')).toBeVisible();
  14 |     await expect(page.getByText('E2E Project Checkpoint')).toBeVisible();
  15 |     await expect(page.getByText('Dr. E2E Faculty')).toBeVisible();
  16 |   });
  17 | 
  18 |   test('opens core student pages', async ({ page }) => {
  19 |     const pages = [
  20 |       { path: '/events', heading: 'Campus Events', text: 'E2E Welcome Night' },
  21 |       { path: '/faculty-directory', heading: 'Faculty Directory', text: 'Dr. E2E Faculty' },
  22 |       { path: '/campus-map', heading: 'Campus Map', text: 'E2E Library' },
  23 |       { path: '/clubs', heading: 'Clubhouse', text: 'E2E Outdoor Club' },
  24 |       { path: '/profile', heading: 'Profile & Preferences', text: 'e2e.student@pocketquad.test' },
  25 |     ];
  26 | 
  27 |     for (const pageConfig of pages) {
  28 |       await page.goto(pageConfig.path);
> 29 |       await expect(page.getByRole('heading', { name: pageConfig.heading })).toBeVisible();
     |                                                                             ^ Error: expect(locator).toBeVisible() failed
  30 |       await expect(page.getByText(pageConfig.text).first()).toBeVisible();
  31 |     }
  32 |   });
  33 | });
  34 | 
```