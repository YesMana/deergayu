/**
 * Homepage Astrology discovery section — small UI enhancement.
 * Does not change navbar, booking, or payments.
 */
import { test, expect } from '@playwright/test';

test.describe('Homepage Astrology discovery section', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('appLang', 'en'));
  });

  test('section appears after Ayurveda with safe copy and CTA to /astrology', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const section = page.locator('.home-astrology-section');
    await expect(section).toBeVisible();
    await expect(section.getByText('Astrology', { exact: true }).first()).toBeVisible();
    await expect(section.getByRole('heading', { name: 'Discover Guidance Through the Stars' })).toBeVisible();
    await expect(section.locator('.section-subtitle')).toContainText(/birth-chart insights/i);

    await expect(section.getByRole('heading', { name: 'Birth Chart' })).toBeVisible();
    await expect(section.getByRole('heading', { name: 'Compatibility' })).toBeVisible();
    await expect(section.getByRole('heading', { name: 'Auspicious Times' })).toBeVisible();

    // Informational cards — not deep-links (Astrology page has no matching anchors)
    await expect(section.locator('.home-astrology-card a')).toHaveCount(0);

    const cta = section.getByRole('link', { name: /Explore Astrology/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', '/astrology');
    await cta.click();
    await expect(page).toHaveURL(/\/astrology/);
  });

  test('section stays below healthcare focus and does not break hero search', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const hero = page.locator('.hero-section');
    const ayurveda = page.locator('.services-section').filter({ hasText: 'Ayurveda consultations' });
    const astrology = page.locator('.home-astrology-section');

    await expect(hero).toBeVisible();
    await expect(page.locator('#home-doctor-name')).toBeVisible();

    const order = await page.evaluate(() => {
      const heroEl = document.querySelector('.hero-section');
      const ayu = Array.from(document.querySelectorAll('.services-section')).find((el) =>
        el.textContent?.includes('Ayurveda consultations')
      );
      const astro = document.querySelector('.home-astrology-section');
      const how = Array.from(document.querySelectorAll('section')).find((el) =>
        el.textContent?.includes('How Deergayu works')
      );
      const pos = (el) => (el ? el.getBoundingClientRect().top : -1);
      return {
        hero: pos(heroEl),
        ayurveda: pos(ayu),
        astrology: pos(astro),
        how: pos(how),
      };
    });

    expect(order.hero).toBeLessThan(order.ayurveda);
    expect(order.ayurveda).toBeLessThan(order.astrology);
    expect(order.astrology).toBeLessThan(order.how);
    await expect(ayurveda).toBeVisible();
    await expect(astrology).toBeVisible();
  });

  test('no overflow at key widths; cards stack on mobile', async ({ page }) => {
    for (const width of [1440, 1024, 390, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.locator('.home-astrology-section').scrollIntoViewIfNeeded();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
      );
      expect(overflow, `overflow @ ${width}`).toBeFalsy();

      const layout = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.home-astrology-card'));
        const tops = cards.map((c) => c.getBoundingClientRect().top);
        const stacked = tops.length >= 2 && Math.abs(tops[0] - tops[1]) > 20;
        const cols = getComputedStyle(document.querySelector('.home-astrology-cards')!).gridTemplateColumns;
        return { stacked, cols, count: cards.length };
      });
      expect(layout.count).toBe(3);
      if (width <= 900) {
        expect(layout.stacked, `cards should stack @ ${width}`).toBeTruthy();
      }
    }
  });

  test('light and dark theme keep readable contrast', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    async function contrastOk() {
      return page.evaluate(() => {
        const section = document.querySelector('.home-astrology-section');
        const title = section?.querySelector('.section-title');
        const card = section?.querySelector('.home-astrology-card');
        const parse = (c) => {
          const m = c?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
        };
        const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const bg = parse(getComputedStyle(section!).backgroundColor);
        // section may use layered backgrounds — fall back to body/card
        const cardBg = parse(getComputedStyle(card!).backgroundColor);
        const titleC = parse(getComputedStyle(title!).color);
        const surface = bg || cardBg;
        if (!surface || !titleC) return false;
        return Math.abs(lum(surface) - lum(titleC)) > 0.15;
      });
    }

    await page.locator('.home-astrology-section').scrollIntoViewIfNeeded();
    expect(await contrastOk()).toBeTruthy();

    await page.getByRole('button', { name: /Toggle theme/i }).click();
    await page.waitForTimeout(200);
    await page.locator('.home-astrology-section').scrollIntoViewIfNeeded();
    expect(await contrastOk()).toBeTruthy();
  });
});
