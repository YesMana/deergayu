/**
 * Extra spot-check: PR frontend + live production API must not render legacy address.
 * (Backend privacy DTO ships with this PR; frontend already omits address fields.)
 */
import { test, expect } from '@playwright/test';

test('production API payload must not surface Manu address fghf on PR UI', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('appLang', 'en'));
  await page.goto('/doctors');
  await expect(page.locator('.doctor-card').first()).toBeVisible({ timeout: 25000 });
  const grid = await page.locator('.doctor-card-grid').innerText();
  expect(grid).toMatch(/Manu|Gaya/i);
  expect(grid).not.toMatch(/\bfghf\b/);
  expect(grid).not.toMatch(/42,\s*dondra/i);

  // Open Manu profile via book id
  const bookHref = await page.locator('a[href*="/channeling?book="]').first().getAttribute('href');
  const id = new URL(bookHref!, 'http://local').searchParams.get('book');
  await page.goto(`/doctors/${id}`);
  await expect(page.locator('.doctor-profile-page')).toBeVisible({ timeout: 25000 });
  // Wait until loading finishes
  await expect(page.getByText(/Loading profile/i)).toHaveCount(0, { timeout: 20000 });
  const profile = await page.locator('.doctor-profile-page').innerText();
  expect(profile).not.toMatch(/\bfghf\b/);
  expect(profile).not.toMatch(/42,\s*dondra/i);
});
