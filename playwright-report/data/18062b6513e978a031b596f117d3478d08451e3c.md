# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> public auth screens >> renders login, register, and forgot password form controls
- Location: tests/e2e/auth.spec.js:16:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByLabel('Password')
Expected: visible
Error: strict mode violation: getByLabel('Password') resolved to 2 elements:
    1) <input value="" required="" type="password" id="login-password" autocomplete="current-password" placeholder="Enter your password" class="w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/70"/> aka getByRole('textbox', { name: 'Password' })
    2) <button type="button" aria-label="Show password" class="text-muted-foreground transition-colors hover:text-foreground">…</button> aka getByRole('button', { name: 'Show password' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByLabel('Password')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - link "PocketQuad logo PocketQuad" [ref=e6] [cursor=pointer]:
          - /url: /login
          - img "PocketQuad logo" [ref=e8]
          - paragraph [ref=e10]: PocketQuad
        - paragraph [ref=e11]: Murray State University
      - generic [ref=e14]:
        - generic [ref=e15]:
          - paragraph [ref=e16]: Welcome back
          - generic [ref=e17]:
            - heading "Sign in" [level=1] [ref=e18]
            - paragraph [ref=e19]: Enter your university email and password to access PocketQuad.
        - generic [ref=e21]:
          - generic [ref=e22]:
            - generic [ref=e24]: Email
            - generic [ref=e25]:
              - img [ref=e27]
              - textbox "Email" [ref=e30]:
                - /placeholder: you@murraystate.edu
          - generic [ref=e31]:
            - generic [ref=e32]:
              - generic [ref=e33]: Password
              - link "Forgot?" [ref=e34] [cursor=pointer]:
                - /url: /forgot-password
            - generic [ref=e35]:
              - img [ref=e37]
              - textbox "Password" [ref=e40]:
                - /placeholder: Enter your password
              - button "Show password" [ref=e42] [cursor=pointer]:
                - img [ref=e43]
          - generic [ref=e47] [cursor=pointer]:
            - checkbox "Remember me" [checked] [ref=e48]
            - generic [ref=e49]: Remember me
          - button "Sign in" [ref=e50] [cursor=pointer]:
            - text: Sign in
            - img [ref=e51]
        - paragraph [ref=e54]:
          - text: New here?
          - link "Create an account" [ref=e55] [cursor=pointer]:
            - /url: /register
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e61] [cursor=pointer]:
    - img [ref=e62]
  - alert [ref=e65]
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
> 19 |     await expect(page.getByLabel('Password')).toBeVisible();
     |                                               ^ Error: expect(locator).toBeVisible() failed
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
  79 |     await expect(page.getByText('PocketQuad E2E University')).toBeVisible();
  80 |   });
  81 | });
  82 | 
```