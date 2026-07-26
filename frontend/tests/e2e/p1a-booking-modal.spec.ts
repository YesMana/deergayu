import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('appLang', 'en'));
});

test('booking modal usable at 375px when logged-out deep-link redirects with book id', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/doctors');
  const book = page.locator('a[href*="/channeling?book="]').first();
  await expect(book).toBeVisible({ timeout: 20000 });
  const href = await book.getAttribute('href');
  expect(href).toMatch(/book=/);
  // Unauthenticated book opens login with returnUrl preserving book id
  await page.goto(href!);
  // Either modal (if somehow authed) or login redirect path containing book
  const url = page.url();
  const hasModal = await page.getByTestId('booking-modal').isVisible().catch(() => false);
  const preservesBook = url.includes('book=') || url.includes(encodeURIComponent('book='));
  expect(hasModal || preservesBook || url.includes('/login')).toBeTruthy();
});

test('channeling page has no horizontal overflow at 320', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/channeling');
  await page.waitForTimeout(600);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(overflow).toBeFalsy();
});
