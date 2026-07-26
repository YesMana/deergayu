import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('appLang', 'en'));
});

test('doctors directory has date filter and loads', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/doctors');
  await expect(page.getByRole('heading', { name: /Find a Doctor/i })).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#doc-date')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  );
  expect(overflow).toBeFalsy();
});

test('legacy doctor id URL still resolves', async ({ page }) => {
  await page.goto('/doctors');
  await expect(page.locator('a[href*="/channeling?book="]').first()).toBeVisible({ timeout: 25000 });
  const bookHref = await page.locator('a[href*="/channeling?book="]').first().getAttribute('href');
  const id = new URL(bookHref!, 'http://local').searchParams.get('book');
  expect(id).toBeTruthy();
  await page.goto(`/doctors/${id}`);
  await expect(page.locator('.doctor-profile-page')).toBeVisible({ timeout: 25000 });
  await expect(page.locator('.profile-header-card h1, h1').first()).toBeVisible({ timeout: 10000 });
});

test('clinics and hospitals empty state (no fake listings)', async ({ page }) => {
  await page.goto('/clinics');
  await expect(page.getByRole('heading', { name: /Clinics/i })).toBeVisible({ timeout: 15000 });
  const body = await page.locator('body').innerText();
  expect(body).toMatch(/No clinics|not listed yet|Empty|no placeholder/i);
  expect(body).not.toMatch(/Demo Clinic|Fake Hospital|Sample Ayurveda/i);

  await page.goto('/hospitals');
  await expect(page.getByRole('heading', { name: /Hospitals/i })).toBeVisible({ timeout: 15000 });
  const h = await page.locator('body').innerText();
  expect(h).toMatch(/No hospitals|not listed yet|Empty|no placeholder/i);
});

test('date filter query param accepted without crash', async ({ page }) => {
  const date = new Date().toISOString().split('T')[0];
  await page.goto(`/doctors?date=${date}`);
  await expect(page.getByRole('heading', { name: /Find a Doctor/i })).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#doc-date')).toHaveValue(date);
});
