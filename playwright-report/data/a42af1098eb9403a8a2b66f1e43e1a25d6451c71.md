# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: faculty.spec.js >> faculty smoke >> opens the faculty profile/settings route
- Location: tests/e2e/faculty.spec.js:17:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('e2e.faculty@pocketquad.test')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('e2e.faculty@pocketquad.test')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "PocketQuad" [ref=e5] [cursor=pointer]:
          - /url: /faculty
          - img [ref=e6]
          - generic [ref=e11]: PocketQuad
        - 'button "Theme: Light" [ref=e12] [cursor=pointer]':
          - img [ref=e13]
    - main [ref=e15]:
      - generic [ref=e17]:
        - generic [ref=e18]:
          - heading "Settings" [level=1] [ref=e19]
          - paragraph [ref=e20]: Update your contact info, manage tags, and choose which pages to show.
        - generic [ref=e21]:
          - heading "Contact information" [level=2] [ref=e22]
          - generic [ref=e23]:
            - generic [ref=e24]:
              - generic [ref=e25]:
                - text: Name
                - textbox "Name" [ref=e26]:
                  - /placeholder: Dr. Maya Thompson
                  - text: Dr. E2E Faculty
              - generic [ref=e27]:
                - text: Title
                - textbox "Title" [ref=e28]:
                  - /placeholder: Associate Professor
                  - text: Associate Professor
            - generic [ref=e29]:
              - text: Email
              - textbox "Email Email is managed by your university account." [disabled] [ref=e30]: e2e.faculty@pocketquad.test
              - paragraph [ref=e31]: Email is managed by your university account.
            - generic [ref=e32]:
              - generic [ref=e33]:
                - text: Department
                - textbox "Department" [ref=e34]:
                  - /placeholder: Computer Science
                  - text: Computer Science
              - generic [ref=e35]:
                - text: Office location
                - textbox "Office location" [ref=e36]:
                  - /placeholder: Engineering Hall 314
                  - text: E2E Library 204
            - generic [ref=e37]:
              - text: Phone
              - textbox "Phone" [ref=e38]:
                - /placeholder: (270) 809-0000
            - generic [ref=e39]:
              - text: Short bio
              - textbox "Short bio" [ref=e40]:
                - /placeholder: What kinds of questions or projects should students come to you for?
                - text: Faculty fixture for E2E smoke tests.
            - generic [ref=e41]:
              - paragraph [ref=e42]: Tags
              - generic [ref=e43]:
                - textbox "internships, research, advising" [ref=e44]
                - button "Add tag" [ref=e45] [cursor=pointer]
              - generic [ref=e46]:
                - generic [ref=e47]:
                  - text: testing
                  - button "Remove testing" [ref=e48] [cursor=pointer]:
                    - img [ref=e49]
                - generic [ref=e52]:
                  - text: advising
                  - button "Remove advising" [ref=e53] [cursor=pointer]:
                    - img [ref=e54]
            - button "Save contact details" [ref=e57] [cursor=pointer]:
              - img [ref=e58]
              - text: Save contact details
        - generic [ref=e63]:
          - heading "Visible pages" [level=2] [ref=e64]
          - paragraph [ref=e65]: Hide pages that are not relevant to you. Hidden pages are removed from the tab bar and the home screen.
          - generic [ref=e66]:
            - button "Office Hours" [ref=e67] [cursor=pointer]:
              - generic [ref=e68]: Office Hours
              - img [ref=e70]
            - button "Events" [ref=e73] [cursor=pointer]:
              - generic [ref=e74]: Events
              - img [ref=e76]
            - button "Announcements" [ref=e79] [cursor=pointer]:
              - generic [ref=e80]: Announcements
              - img [ref=e82]
            - button "Buildings" [ref=e85] [cursor=pointer]:
              - generic [ref=e86]: Buildings
              - img [ref=e88]
        - generic [ref=e92]:
          - heading "Account" [level=2] [ref=e93]
          - button "Log out" [ref=e94] [cursor=pointer]:
            - img [ref=e95]
            - text: Log out
    - navigation "Faculty navigation" [ref=e98]:
      - generic [ref=e99]:
        - link "Hours" [ref=e100] [cursor=pointer]:
          - /url: /faculty/office-hours
          - img [ref=e101]
          - generic [ref=e104]: Hours
        - link "Events" [ref=e105] [cursor=pointer]:
          - /url: /faculty/events
          - img [ref=e106]
          - generic [ref=e108]: Events
        - link "Announce" [ref=e109] [cursor=pointer]:
          - /url: /faculty/announcements
          - img [ref=e110]
          - generic [ref=e113]: Announce
        - link "Buildings" [ref=e114] [cursor=pointer]:
          - /url: /faculty/buildings
          - img [ref=e115]
          - generic [ref=e119]: Buildings
        - link "Settings" [ref=e120] [cursor=pointer]:
          - /url: /faculty/settings
          - img [ref=e121]
          - generic [ref=e124]: Settings
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e130] [cursor=pointer]:
    - img [ref=e131]
  - alert [ref=e134]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { signInAs } from './helpers/auth';
  3  | 
  4  | test.describe('faculty smoke', () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await signInAs(page, 'faculty');
  7  |   });
  8  | 
  9  |   test('opens the faculty home workspace', async ({ page }) => {
  10 |     await page.goto('/faculty');
  11 | 
  12 |     await expect(page.getByRole('heading', { name: /E2E\./ })).toBeVisible();
  13 |     await expect(page.getByText('What would you like to do today?')).toBeVisible();
  14 |     await expect(page.getByText('Change office hours')).toBeVisible();
  15 |   });
  16 | 
  17 |   test('opens the faculty profile/settings route', async ({ page }) => {
  18 |     await page.goto('/faculty/profile');
  19 | 
  20 |     await expect(page).toHaveURL(/\/faculty\/settings$/);
> 21 |     await expect(page.getByText('e2e.faculty@pocketquad.test')).toBeVisible();
     |                                                                 ^ Error: expect(locator).toBeVisible() failed
  22 |     await expect(page.getByText('Dr. E2E Faculty').first()).toBeVisible();
  23 |   });
  24 | });
  25 | 
```