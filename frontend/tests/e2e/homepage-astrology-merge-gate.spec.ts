/**
 * PR #17 final homepage Astrology + trust merge gate.
 * Does not merge or deploy.
 */
import { test, expect } from '@playwright/test';

test.describe('PR #17 homepage Astrology merge gate', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('appLang', 'en'));
  });

  test('Astrology section content, CTA, and secondary hierarchy', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const heroTitle = page.locator('.hero-title');
    const astro = page.locator('.home-astrology-section');
    await expect(astro).toBeVisible();
    await expect(astro.getByRole('heading', { name: 'Discover Guidance Through the Stars' })).toBeVisible();
    await expect(astro.locator('.section-subtitle')).toContainText(/birth-chart insights/i);
    await expect(astro.getByRole('heading', { name: 'Birth Chart' })).toBeVisible();
    await expect(astro.getByRole('heading', { name: 'Compatibility' })).toBeVisible();
    await expect(astro.getByRole('heading', { name: 'Auspicious Times' })).toBeVisible();
    await expect(astro.locator('.home-astrology-card a')).toHaveCount(0);

    const sizes = await page.evaluate(() => {
      const hero = document.querySelector('.hero-title');
      const astroH = document.querySelector('.home-astrology-section .section-title');
      return {
        hero: parseFloat(getComputedStyle(hero!).fontSize),
        astro: parseFloat(getComputedStyle(astroH!).fontSize),
      };
    });
    expect(sizes.astro).toBeLessThan(sizes.hero - 8);

    const cta = astro.getByRole('link', { name: /Explore Astrology/i });
    await expect(cta).toHaveAttribute('href', '/astrology');
    await cta.click();
    await expect(page).toHaveURL(/\/astrology$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });

  test('homepage does not show floored fake platform-scale numbers', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });

    // Must not render floored API counters as trust metrics
    await expect(page.locator('.stat-value')).toHaveCount(0);
    await expect(page.locator('.home-trust-section .stat-value')).toHaveCount(0);
    await expect(page.getByText('Consultations recorded')).toHaveCount(0);
    await expect(page.getByText('Listed providers')).toHaveCount(0);
    await expect(page.locator('.stats-section').getByText('Shop products')).toHaveCount(0);

    const trust = page.locator('.home-trust-section');
    await expect(trust.getByText('Approved providers')).toBeVisible();
    await expect(trust.getByText('Secure appointment booking')).toBeVisible();
    await expect(trust.getByText(/Ayurvedic products/)).toBeVisible();
  });

  test('responsive widths have no overflow', async ({ page }) => {
    for (const width of [1440, 1280, 1024, 768, 430, 390, 375, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.locator('.home-astrology-section').scrollIntoViewIfNeeded();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
      );
      expect(overflow, `overflow @ ${width}`).toBeFalsy();
      await expect(page.locator('.home-astrology-section')).toBeVisible();
      await expect(page.getByRole('link', { name: /Explore Astrology/i })).toBeVisible();
    }
  });

  test('dark and light theme readability for Astrology section', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.addInitScript(() => {
      localStorage.setItem('appTheme', 'dark');
    });

    async function check(width) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator('.home-astrology-section').scrollIntoViewIfNeeded();
      const ok = await page.evaluate(() => {
        const section = document.querySelector('.home-astrology-section');
        const title = section?.querySelector('.section-title');
        const card = section?.querySelector('.home-astrology-card');
        const cta = section?.querySelector('.home-astrology-cta-btn');
        const parse = (c) => {
          const m = c?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
        };
        const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const titleC = parse(getComputedStyle(title!).color);
        const cardBg = parse(getComputedStyle(card!).backgroundColor);
        const ctaC = parse(getComputedStyle(cta!).color);
        if (!titleC || !cardBg || !ctaC) return false;
        return Math.abs(lum(titleC) - lum(cardBg)) > 0.12 && Math.abs(lum(ctaC) - lum(cardBg)) > 0.08;
      });
      expect(ok, `contrast @ ${width}`).toBeTruthy();
    }

    await check(1440);
    await check(390);

    await page.evaluate(() => {
      localStorage.setItem('appTheme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await check(1440);
    await check(390);
  });

  test('homepage regression: search, nav, mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('#home-doctor-name')).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Find a Doctor' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Book Appointment' })).toBeVisible();
    await nav.getByRole('link', { name: 'Ayurveda' }).click();
    await expect(page).toHaveURL(/\/ayurveda/);
    await page.goto('/');
    await nav.getByRole('link', { name: /Shop/i }).click();
    await expect(page).toHaveURL(/\/shop/);
    await page.goto('/');
    await nav.getByRole('link', { name: 'Guide' }).click();
    await expect(page).toHaveURL(/\/ayurvedic-guide/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: /Open menu/i }).click();
    await expect(page.locator('#mobile-nav-panel')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Book Appointment' })).toBeVisible();
  });
});
