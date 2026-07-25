import { test, expect } from '@playwright/test';

async function dismissLanguagePopup(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('appLang', 'en');
    } catch {
      /* ignore */
    }
  });
}

const PUBLIC_ROUTES = [
  '/',
  '/doctors',
  '/specialties',
  '/ayurveda',
  '/online-consultation',
  '/about',
  '/faq',
  '/join-as-doctor',
  '/join-as-clinic',
  '/contact',
  '/shop',
  '/ayurvedic-guide',
  '/videos',
  '/astrology',
  '/channeling',
];

test.describe('P1-A public routes', () => {
  test.beforeEach(async ({ page }) => {
    await dismissLanguagePopup(page);
  });

  for (const route of PUBLIC_ROUTES) {
    test(`loads ${route}`, async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.ok() || res?.status() === 304).toBeTruthy();
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('nav.navbar')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    });
  }

  test('invalid doctor id shows not-found state', async ({ page }) => {
    await page.goto('/doctors/nonexistent-doctor-id-xyz');
    await expect(page.getByText(/Doctor not found|not found/i)).toBeVisible({ timeout: 15000 });
  });

  test('invalid specialty slug shows empty/not-found', async ({ page }) => {
    await page.goto('/specialties/this-specialty-does-not-exist-zzz');
    await expect(page.getByText(/Specialty not found|View all specialties|No specialties/i)).toBeVisible({
      timeout: 15000,
    });
  });

  test('homepage search navigates with query params (no date)', async ({ page }) => {
    await page.goto('/');
    await page.locator('#home-doctor-name').fill('test');
    await page.locator('#home-consult-type').selectOption('in_person');
    await page.getByRole('button', { name: 'Find a Doctor' }).first().click();
    await expect(page).toHaveURL(/\/doctors\?/);
    expect(page.url()).toContain('q=test');
    expect(page.url()).toContain('type=in_person');
    expect(page.url()).not.toContain('date=');
  });

  test('nav primary healthcare links exist on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Find a Doctor' }).first()).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Ayurveda' }).first()).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Online Consultation' }).first()).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Guide' }).first()).toBeVisible();
  });

  test('doctors page never shows Verified Doctor label', async ({ page }) => {
    await page.goto('/doctors');
    await page.waitForTimeout(1500);
    await expect(page.getByText('Verified Doctor')).toHaveCount(0);
    await expect(page.getByText('Verified provider')).toHaveCount(0);
  });

  test('doctor card Book preserves provider id', async ({ page }) => {
    await page.goto('/doctors');
    const profileLink = page.locator('a[href^="/doctors/"]').filter({ hasNotText: 'Find' }).first();
    await expect(profileLink).toBeVisible({ timeout: 20000 });
    const href = await profileLink.getAttribute('href');
    const id = href?.replace('/doctors/', '');
    expect(id && id.length > 5).toBeTruthy();
    const book = page.locator(`a[href*="book=${id}"]`).first();
    await expect(book).toBeVisible();
    await book.click();
    await expect(page).toHaveURL(new RegExp(`book=${id}`));
  });

  test('profile Book CTA targets selected provider', async ({ page }) => {
    await page.goto('/doctors');
    const profileLink = page.locator('a[href^="/doctors/"]').filter({ hasText: /View profile/i }).first();
    await expect(profileLink).toBeVisible({ timeout: 20000 });
    await profileLink.click();
    await expect(page).toHaveURL(/\/doctors\/.+/);
    const book = page.locator('a[href*="/channeling?book="]').first();
    await expect(book).toBeVisible();
    const href = await book.getAttribute('href');
    expect(href).toMatch(/book=/);
    await book.click();
    await expect(page).toHaveURL(/\/channeling\?book=/);
  });

  test('shows Deergayu Approved badge on doctor cards', async ({ page }) => {
    await page.goto('/doctors');
    await expect(page.getByText('Deergayu Approved').first()).toBeVisible({ timeout: 20000 });
  });
});

const VIEWPORTS = [
  { name: '320', width: 320, height: 568 },
  { name: '375', width: 375, height: 667 },
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 900 },
];

for (const vp of VIEWPORTS) {
  test.describe(`responsive ${vp.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await dismissLanguagePopup(page);
    });

    test(`no horizontal overflow on key pages @ ${vp.width}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const route of ['/', '/doctors', '/ayurveda', '/faq', '/contact']) {
        await page.goto(route);
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return doc.scrollWidth > doc.clientWidth + 2;
        });
        expect(overflow, `${route} overflow at ${vp.width}`).toBeFalsy();
      }
    });
  });
}
