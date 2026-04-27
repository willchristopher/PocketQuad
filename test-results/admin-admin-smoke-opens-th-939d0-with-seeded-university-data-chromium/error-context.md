# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.js >> admin smoke >> opens the admin dashboard with seeded university data
- Location: tests/e2e/admin.spec.js:9:7

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
  2  | import { signInAs } from './helpers/auth';
  3  | 
  4  | test.describe('admin smoke', () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await signInAs(page, 'admin');
  7  |   });
  8  | 
  9  |   test('opens the admin dashboard with seeded university data', async ({ page }) => {
  10 |     await page.goto('/admin');
  11 | 
  12 |     await expect(page).toHaveURL(/\/admin$/);
> 13 |     await expect(page.getByText('PocketQuad E2E University')).toBeVisible();
     |                                                               ^ Error: expect(locator).toBeVisible() failed
  14 |     await expect(page.getByText('Faculty')).toBeVisible();
  15 |     await expect(page.getByText('Clubs')).toBeVisible();
  16 |     await expect(page.getByText('Events')).toBeVisible();
  17 |   });
  18 | });
  19 | 
```