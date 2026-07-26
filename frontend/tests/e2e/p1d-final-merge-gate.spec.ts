import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * P1-D FINAL LOCALIZATION MERGE GATE
 * Visual + structural checks for EN/SI/TA. Does not mutate production data.
 */

const ARTIFACT_DIR = '/opt/cursor/artifacts/p1d-merge-gate';

async function gotoLang(page: Page, route: string, lang: 'en' | 'si' | 'ta') {
  await page.addInitScript((l) => {
    localStorage.setItem('appLang', l);
  }, lang);
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.querySelectorAll('.language-overlay').forEach((el) => el.remove());
  });
  await expect(page.locator('html')).toHaveAttribute('lang', lang, { timeout: 15000 });
}

async function assertNoBrokenTokens(page: Page) {
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('undefined');
  expect(body).not.toContain('[object Object]');
  expect(body).not.toContain('null');
  // literal translation keys that slipped into UI (snake_case platform keys)
  expect(body).not.toMatch(/\b(home_[a-z0-9_]+|nav_[a-z0-9_]+|ch_[a-z0-9_]+|vd_[a-z0-9_]+|admin_[a-z0-9_]+|err_[a-z0-9_]+|badge_[a-z0-9_]+|pc_[a-z0-9_]+|shop_[a-z0-9_]+|cart_[a-z0-9_]+)\b/);
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyScroll: document.body.scrollWidth,
    };
  });
  expect(
    overflow.scrollWidth,
    `horizontal overflow: scroll=${overflow.scrollWidth} client=${overflow.clientWidth}`
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function shot(page: Page, name: string) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, `${name}.png`),
    fullPage: false,
  });
}

test.describe('P1-D merge gate — public pages EN/SI/TA', () => {
  for (const lang of ['en', 'si', 'ta'] as const) {
    test(`public chrome ${lang}`, async ({ page }) => {
      const markers: Record<string, string> = {
        en: 'Find a Doctor',
        si: 'වෛද්‍යවරයෙකු සොයන්න',
        ta: 'மருத்துவரைத் தேடுங்கள்',
      };

      await gotoLang(page, '/', lang);
      await assertNoBrokenTokens(page);
      await expect(page.locator('body')).toContainText(markers[lang]);
      await shot(page, `home-${lang}-1440`);

      for (const route of ['/doctors', '/channeling', '/shop', '/about', '/contact', '/login']) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
          document.querySelectorAll('.language-overlay').forEach((el) => el.remove());
        });
        await expect(page.locator('html')).toHaveAttribute('lang', lang);
        await assertNoBrokenTokens(page);
      }

      await page.goto('/doctors/dr-p-h-s-gaya', { waitUntil: 'networkidle' });
      await expect(page.getByRole('heading', { level: 1 })).toContainText(/Gaya/i);
      await assertNoBrokenTokens(page);
      if (lang === 'si') await expect(page.locator('body')).toContainText('Deergayu අනුමත');
      if (lang === 'ta') await expect(page.locator('body')).toContainText('Deergayu அங்கீகரிக்கப்பட்டது');
      if (lang === 'en') await expect(page.locator('body')).toContainText('Deergayu Approved');
    });
  }
});

test.describe('P1-D merge gate — navbar', () => {
  for (const lang of ['en', 'si', 'ta'] as const) {
    test(`navbar desktop ${lang}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await gotoLang(page, '/', lang);
      await assertNoBrokenTokens(page);
      await assertNoHorizontalOverflow(page);
      await expect(page.locator('button.lang-btn')).toBeVisible();
      await shot(page, `navbar-desktop-${lang}-1440`);
    });

    test(`navbar mobile ${lang}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await gotoLang(page, '/', lang);
      await assertNoHorizontalOverflow(page);
      const hamburger = page.locator('.mobile-menu-btn').first();
      await expect(hamburger).toBeVisible();
      await hamburger.click();
      await expect(page.locator('.mobile-menu, .mobile-nav-links').first()).toBeVisible();
      await expect(page.locator('button.lang-btn')).toBeVisible();
      await assertNoBrokenTokens(page);
      await shot(page, `navbar-mobile-${lang}-390`);
    });
  }

  test('SI switches to hamburger by 1280', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoLang(page, '/', 'si');
    await expect(page.locator('.mobile-menu-btn')).toBeVisible();
    await expect(page.locator('.nav-links.desktop-only')).toBeHidden();
    await assertNoHorizontalOverflow(page);
    await shot(page, `navbar-si-1280-hamburger`);
  });
});

test.describe('P1-D merge gate — responsive SI/TA', () => {
  const widths = [1440, 1280, 1024, 430, 390, 375, 320];
  for (const lang of ['si', 'ta'] as const) {
    for (const w of widths) {
      test(`${lang} @ ${w}`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: 900 });
        await gotoLang(page, '/', lang);
        await assertNoHorizontalOverflow(page);
        await assertNoBrokenTokens(page);
        await page.goto('/doctors', { waitUntil: 'domcontentloaded' });
        await assertNoHorizontalOverflow(page);
        await page.goto('/channeling', { waitUntil: 'domcontentloaded' });
        await assertNoHorizontalOverflow(page);
        if ([1440, 1280, 390, 375, 320].includes(w)) {
          await shot(page, `responsive-${lang}-${w}`);
        }
      });
    }
  }
});

test.describe('P1-D merge gate — booking + language switch', () => {
  test('booking CTAs localize and login gate preserves language', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // EN booking CTA on channeling
    await gotoLang(page, '/channeling', 'en');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.provider-actions .btn-primary').first()).toContainText(/Book|Visit/i);

    // SI booking CTA
    await gotoLang(page, '/channeling', 'si');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.provider-actions .btn-primary').first()).toBeVisible();
    await expect(page.locator('body')).toContainText(/හමුව|වීඩියෝ/i);
    await assertNoBrokenTokens(page);

    // Unauthenticated book → login redirect; language must remain SI
    await page.locator('.provider-actions .btn-primary').first().click();
    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'si');
    expect(await page.evaluate(() => localStorage.getItem('appLang'))).toBe('si');
    await expect(page).toHaveURL(/returnUrl=.*channeling/);
    await expect(page.getByText(/Dialog Pay|PayHere|Complete payment/i)).toHaveCount(0);
    await shot(page, 'booking-login-gate-si');
  });

  test('language toggle on channeling does not remount away from page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoLang(page, '/channeling', 'en');
    await page.waitForLoadState('networkidle');
    // Capture a filter selection (specialty) as stand-in for booking state survival
    const specialty = page.locator('select').first();
    if (await specialty.count()) {
      const options = await specialty.locator('option').allTextContents();
      if (options.length > 1) {
        await specialty.selectOption({ index: 1 });
        const valueBefore = await specialty.inputValue();
        await page.locator('button.lang-btn').click();
        await expect(page.locator('html')).toHaveAttribute('lang', 'si');
        await expect(page).toHaveURL(/\/channeling/);
        // Filter control still present with same value (state not wiped by language change)
        await expect(page.locator('select').first()).toHaveValue(valueBefore);
      }
    }
    await expect(page.getByText(/Dialog Pay|PayHere|Complete payment|Pay now/i)).toHaveCount(0);
    await assertNoBrokenTokens(page);
  });
});

test.describe('P1-D merge gate — persistence', () => {
  test('SI persists across refresh and deep link', async ({ page }) => {
    await gotoLang(page, '/', 'si');
    await page.goto('/doctors/dr-manu', { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'si');
    expect(await page.evaluate(() => localStorage.getItem('appLang'))).toBe('si');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'si');
  });

  test('TA persists across refresh', async ({ page }) => {
    await gotoLang(page, '/shop', 'ta');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'ta');
    expect(await page.evaluate(() => localStorage.getItem('appLang'))).toBe('ta');
  });
});

test.describe('P1-D merge gate — dashboard chrome structure', () => {
  // Without auth, dashboards redirect to login — verify localized login chrome + route existence.
  for (const lang of ['en', 'si', 'ta'] as const) {
    test(`auth gate chrome ${lang}`, async ({ page }) => {
      await gotoLang(page, '/vendor', lang);
      // Either dashboard or login redirect
      await page.waitForLoadState('domcontentloaded');
      await assertNoBrokenTokens(page);
      const url = page.url();
      expect(url.includes('/login') || url.includes('/vendor') || url.includes('/dashboard')).toBeTruthy();
    });

    test(`admin route chrome ${lang}`, async ({ page }) => {
      await gotoLang(page, '/admin', lang);
      await page.waitForLoadState('domcontentloaded');
      await assertNoBrokenTokens(page);
    });

    test(`patient dashboard route ${lang}`, async ({ page }) => {
      await gotoLang(page, '/dashboard', lang);
      await page.waitForLoadState('domcontentloaded');
      await assertNoBrokenTokens(page);
    });
  }
});

test.describe('P1-D merge gate — payments flag', () => {
  test('appointmentPaymentsEnabled false', async ({ request }) => {
    // Local app may proxy; also check production API remains false
    const res = await request.get('https://deergayu-api.onrender.com/api/storefront-settings');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.appointmentPaymentsEnabled).toBe(false);
  });
});
