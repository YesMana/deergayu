import { test, expect } from '@playwright/test';

async function hasOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  );
}

test.describe('Navbar UX polish', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('appLang', 'en'));
  });

  test('desktop hierarchy and single Book Appointment CTA', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav).toBeVisible();

    // Primary links present; Home text item gone (logo is home)
    await expect(nav.getByRole('link', { name: 'Find a Doctor' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Ayurveda' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Online Consultation' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Guide' })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Shop/i })).toBeVisible();

    // No duplicate Find a Doctor button CTA
    await expect(nav.getByRole('link', { name: 'Find a Doctor', exact: true })).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Book Appointment' })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Book$/ })).toHaveCount(0);

    // Mic not in primary action bar
    await expect(nav.getByRole('button', { name: 'Voice search' })).toHaveCount(0);

    // More menu contents
    await nav.getByRole('button', { name: /More/i }).click();
    const more = page.locator('.nav-dropdown-menu');
    await expect(more.getByRole('menuitem', { name: 'About' })).toBeVisible();
    await expect(more.getByRole('menuitem', { name: 'Contact' })).toBeVisible();
    await expect(more.getByRole('menuitem', { name: 'Specialties' })).toBeVisible();
    await expect(more.getByRole('menuitem', { name: 'Videos' })).toBeVisible();
    await expect(more.getByRole('menuitem', { name: 'Astrology' })).toBeVisible();
    await expect(more.getByRole('menuitem', { name: 'Voice search' })).toBeVisible();
    // Empty facilities — Clinics/Hospitals hidden
    await expect(more.getByRole('menuitem', { name: 'Clinics' })).toHaveCount(0);
    await expect(more.getByRole('menuitem', { name: 'Hospitals' })).toHaveCount(0);

    // Book Appointment routes to channeling
    await nav.getByRole('link', { name: 'Book Appointment' }).click();
    await expect(page).toHaveURL(/channeling|login/);
  });

  test('no wrap / no overflow at key widths', async ({ page }) => {
    for (const width of [1440, 1280, 1200, 1024, 390, 375]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/doctors');
      await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
      expect(await hasOverflow(page), `overflow at ${width}`).toBeFalsy();

      if (width >= 1100) {
        // Desktop links visible and nowrap
        const wrap = await page.locator('.nav-links').evaluate((el) => {
          const style = getComputedStyle(el);
          return style.flexWrap === 'wrap' || el.scrollHeight > el.clientHeight + 4;
        });
        expect(wrap, `nav wrap at ${width}`).toBeFalsy();
        await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Book Appointment' })).toBeVisible();
      } else {
        await expect(page.getByRole('button', { name: /Open menu|Close menu/i })).toBeVisible();
      }
    }
  });

  test('mobile menu contains required links', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: /Open menu/i }).click();
    const panel = page.locator('#mobile-nav-panel');
    await expect(panel.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Find a Doctor' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Book Appointment' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Ayurveda' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Online Consultation' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Guide' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Shop' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Specialties' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'About' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Contact' })).toBeVisible();
    expect(await hasOverflow(page)).toBeFalsy();
  });

  test('Escape closes More menu', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: /More/i }).click();
    await expect(page.locator('.nav-dropdown-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.nav-dropdown-menu')).toHaveCount(0);
  });
});
