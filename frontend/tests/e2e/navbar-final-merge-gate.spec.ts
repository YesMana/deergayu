/**
 * PR #16 FINAL NAVBAR MERGE GATE — visual/functional spot-check.
 * Does not merge or deploy.
 */
import { test, expect } from '@playwright/test';

async function metrics(page) {
  return page.evaluate(() => {
    const nav = document.querySelector('nav.navbar');
    const links = document.querySelector('.nav-links.desktop-only, .nav-links');
    const content = document.querySelector('.nav-content');
    const brand = document.querySelector('.brand-logo');
    const cta = document.querySelector('.nav-cta');
    const actions = document.querySelector('.nav-actions');
    const hero = document.querySelector('.hero-section, .pub-hero');
    const navRect = nav?.getBoundingClientRect();
    const linksRect = links?.getBoundingClientRect();
    const ctaRect = cta?.getBoundingClientRect();
    const actionsRect = actions?.getBoundingClientRect();
    const brandRect = brand?.getBoundingClientRect();
    const heroRect = hero?.getBoundingClientRect();

    const linkEls = links ? Array.from(links.querySelectorAll('a, .nav-dropdown-trigger')) : [];
    const anyWrap = linkEls.some((el) => {
      const r = el.getBoundingClientRect();
      return r.height > 36; // single-line label should stay compact
    });
    const linksMultiline =
      links && linksRect ? linksRect.height > 48 : false;

    const overflow =
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;

    const desktopVisible = links
      ? getComputedStyle(links).display !== 'none'
      : false;
    const hamburger = document.querySelector('.mobile-menu-btn');
    const hamburgerVisible = hamburger
      ? getComputedStyle(hamburger).display !== 'none'
      : false;

    // Overlap checks (AABB)
    const overlaps = (a, b) =>
      a &&
      b &&
      !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);

    const clippedText = linkEls.some((el) => el.scrollWidth > el.clientWidth + 1);

    // Vertical alignment of utilities (theme/lang/cart) — centers within ~8px
    const utilBtns = actions
      ? Array.from(actions.querySelectorAll('.icon-btn, .nav-cta, .user-avatar-btn, .nav-login'))
          .filter((el) => getComputedStyle(el).display !== 'none')
          .map((el) => el.getBoundingClientRect())
      : [];
    let utilAligned = true;
    if (utilBtns.length >= 2) {
      const mids = utilBtns.map((r) => r.top + r.height / 2);
      const avg = mids.reduce((s, v) => s + v, 0) / mids.length;
      utilAligned = mids.every((m) => Math.abs(m - avg) <= 10);
    }

    return {
      overflow,
      desktopVisible,
      hamburgerVisible,
      anyWrap,
      linksMultiline,
      clippedText,
      utilAligned,
      brandVisible: brandRect ? brandRect.width > 20 && brandRect.height > 20 : false,
      ctaVisible: cta ? getComputedStyle(cta).display !== 'none' : false,
      ctaOverlapsActions: overlaps(ctaRect, actionsRect) && cta && actions,
      // CTA is inside actions — check CTA doesn't overlap brand/links instead
      ctaOverlapsLinks: overlaps(ctaRect, linksRect),
      ctaOverlapsBrand: overlaps(ctaRect, brandRect),
      navHeight: navRect?.height || 0,
      heroTop: heroRect?.top ?? null,
      heroGap: heroRect && navRect ? heroRect.top - navRect.bottom : null,
      contentHeight: content?.getBoundingClientRect().height || 0,
      primaryLabels: linkEls.map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim()),
    };
  });
}

test.describe('PR #16 final navbar merge gate', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('appLang', 'en'));
  });

  const desktopWidths = [1440, 1280, 1200, 1110];
  const transitionWidths = [1100];
  const tabletMobile = [1024, 768, 430, 390, 375];

  for (const width of desktopWidths) {
    test(`desktop single-row @ ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const nav = page.getByRole('navigation', { name: 'Main' });
      await expect(nav).toBeVisible();

      const m = await metrics(page);
      expect(m.overflow, 'horizontal overflow').toBeFalsy();
      expect(m.desktopVisible, 'desktop nav visible').toBeTruthy();
      expect(m.hamburgerVisible, 'hamburger hidden on desktop').toBeFalsy();
      expect(m.linksMultiline, 'primary row multiline').toBeFalsy();
      expect(m.anyWrap, 'label wrap height').toBeFalsy();
      expect(m.clippedText, 'clipped labels').toBeFalsy();
      expect(m.brandVisible, 'logo visible').toBeTruthy();
      expect(m.ctaVisible, 'Book Appointment visible').toBeTruthy();
      expect(m.ctaOverlapsLinks, 'CTA overlaps links').toBeFalsy();
      expect(m.ctaOverlapsBrand, 'CTA overlaps logo').toBeFalsy();
      expect(m.utilAligned, 'utilities vertical align').toBeTruthy();
      expect(m.contentHeight).toBeLessThanOrEqual(80);

      await expect(nav.getByRole('link', { name: 'Find a Doctor' })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Ayurveda' })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Online Consultation' })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Guide' })).toBeVisible();
      await expect(nav.getByRole('link', { name: /Shop/i })).toBeVisible();
      await expect(nav.getByRole('button', { name: /More/i })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Book Appointment' })).toBeVisible();
      // no duplicate Find a Doctor CTA button
      await expect(nav.getByRole('link', { name: 'Find a Doctor' })).toHaveCount(1);
    });
  }

  for (const width of transitionWidths) {
    test(`clean hamburger transition @ ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForSelector('.brand-logo');
      const m = await metrics(page);
      expect(m.overflow).toBeFalsy();
      // At 1100 and below: hamburger, no wrapping desktop labels
      expect(m.hamburgerVisible).toBeTruthy();
      expect(m.desktopVisible).toBeFalsy();
      expect(m.linksMultiline).toBeFalsy();
      expect(m.brandVisible).toBeTruthy();
    });
  }

  // Edge: 1110 desktop (if fits) → 1100 hamburger; never a wrapped hybrid
  test('1110 vs 1100 transition has no hybrid broken state', async ({ page }) => {
    await page.setViewportSize({ width: 1110, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });
    const at1110 = await metrics(page);

    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });
    const at1100 = await metrics(page);

    // 1110 desktop OR already hamburger — never wrap while desktop visible
    if (at1110.desktopVisible) {
      expect(at1110.linksMultiline).toBeFalsy();
      expect(at1110.anyWrap).toBeFalsy();
      expect(at1110.ctaOverlapsLinks).toBeFalsy();
      expect(at1110.hamburgerVisible).toBeFalsy();
    } else {
      expect(at1110.hamburgerVisible).toBeTruthy();
    }
    expect(at1100.hamburgerVisible).toBeTruthy();
    expect(at1100.desktopVisible).toBeFalsy();
    expect(at1100.overflow).toBeFalsy();
    expect(at1110.overflow).toBeFalsy();
  });

  for (const width of tabletMobile) {
    test(`mobile/tablet no overflow @ ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForSelector('.brand-logo');
      // Ensure logo has painted
      await page.waitForFunction(() => {
        const img = document.querySelector('.brand-logo');
        return img && img.getBoundingClientRect().width > 10;
      });
      const m = await metrics(page);
      expect(m.overflow).toBeFalsy();
      expect(m.hamburgerVisible).toBeTruthy();
      expect(m.desktopVisible).toBeFalsy();
      expect(m.brandVisible).toBeTruthy();
    });
  }

  test('More dropdown contents, Escape, outside click', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await nav.getByRole('button', { name: /More/i }).click();
    const menu = page.locator('.nav-dropdown-menu');
    await expect(menu).toBeVisible();

    for (const label of [
      'About',
      'Contact',
      'Specialties',
      'Videos',
      'Astrology',
      'FAQ',
      'Join as Doctor',
      'Voice search',
    ]) {
      await expect(menu.getByRole('menuitem', { name: label })).toBeVisible();
    }
    await expect(menu.getByRole('menuitem', { name: 'Clinics' })).toHaveCount(0);
    await expect(menu.getByRole('menuitem', { name: 'Hospitals' })).toHaveCount(0);

    // In viewport
    const box = await menu.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.x).toBeGreaterThanOrEqual(-2);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1440 + 2);

    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);

    await nav.getByRole('button', { name: /More/i }).click();
    await expect(page.locator('.nav-dropdown-menu')).toBeVisible();
    await page.locator('.brand').click();
    await expect(page.locator('.nav-dropdown-menu')).toHaveCount(0);
  });

  test('mobile menu prominence and close on navigate', async ({ page }) => {
    for (const width of [430, 390, 375]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');
      await page.getByRole('button', { name: /Open menu/i }).click();
      const panel = page.locator('#mobile-nav-panel');
      await expect(panel).toBeVisible();

      const panelBox = await panel.boundingBox();
      expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(width + 2);

      await expect(panel.getByRole('link', { name: 'Book Appointment' })).toBeVisible();
      await expect(panel.getByRole('link', { name: 'Find a Doctor' })).toBeVisible();
      await expect(panel.getByRole('button', { name: /Voice search/i })).toBeVisible();
      await expect(panel.getByRole('link', { name: /Login|Sign Up|My Account|Admin|Dashboard/i })).toBeVisible();

      // Utilities remain in header
      await expect(page.getByRole('button', { name: /Toggle theme/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Switch language/i })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Cart' })).toBeVisible();

      expect(await metrics(page).then((m) => m.overflow)).toBeFalsy();

      await panel.getByRole('link', { name: 'Find a Doctor' }).click();
      await expect(page).toHaveURL(/\/doctors/);
      await expect(page.locator('#mobile-nav-panel.open')).toHaveCount(0);
    }
  });

  test('active states on primary routes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const cases = [
      ['/doctors', 'Find a Doctor'],
      ['/ayurveda', 'Ayurveda'],
      ['/online-consultation', 'Online Consultation'],
      ['/ayurvedic-guide', 'Guide'],
      ['/shop', /Shop/i],
    ];
    for (const [path, label] of cases) {
      await page.goto(path);
      const nav = page.getByRole('navigation', { name: 'Main' });
      const active = nav.locator('a.active');
      await expect(active).toHaveCount(1);
      await expect(nav.getByRole('link', { name: label })).toHaveClass(/active/);
      // Not an oversized pill — background transparent / no large filled chip
      const bg = await nav.getByRole('link', { name: label }).evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent').toBeTruthy();
    }
  });

  test('hero sits below sticky navbar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.hero-section');
    const m = await metrics(page);
    expect(m.navHeight).toBeGreaterThanOrEqual(60);
    expect(m.navHeight).toBeLessThanOrEqual(80);
    expect(m.heroTop).not.toBeNull();
    expect(m.heroTop!).toBeGreaterThanOrEqual(0);

    const layout = await page.evaluate(() => {
      const main = document.querySelector('main');
      const heroText = document.querySelector('.hero-title, .hero-brand-signal, .hero-content');
      const nav = document.querySelector('nav.navbar');
      const mainPad = main ? parseInt(getComputedStyle(main).paddingTop, 10) : 0;
      const navBottom = nav?.getBoundingClientRect().bottom ?? 0;
      const textTop = heroText?.getBoundingClientRect().top ?? 0;
      return { mainPad, navBottom, textTop, textBelowNav: textTop >= navBottom - 2 };
    });
    expect(layout.mainPad).toBeGreaterThanOrEqual(64);
    expect(layout.textBelowNav).toBeTruthy();

    await page.evaluate(() => window.scrollTo(0, 400));
    const top = await page.locator('nav.navbar').evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBe(0);
    await expect(page.locator('nav.navbar')).toHaveClass(/scrolled/);
  });

  test('dark and light theme contrast', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    async function themeCheck(mode) {
      const data = await page.evaluate(() => {
        const nav = document.querySelector('nav.navbar');
        const link = nav?.querySelector('.nav-links a');
        const cta = nav?.querySelector('.nav-cta');
        const icon = nav?.querySelector('.icon-btn');
        const cs = (el) => (el ? getComputedStyle(el) : null);
        const parse = (c) => {
          const m = c?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
        };
        const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const linkC = parse(cs(link)?.color);
        const navBg = parse(cs(nav)?.backgroundColor) || parse(getComputedStyle(document.body).backgroundColor);
        const ctaC = parse(cs(cta)?.color);
        const ctaBg = parse(cs(cta)?.backgroundColor);
        const iconC = parse(cs(icon)?.color);
        return {
          linkLum: linkC ? lum(linkC) : null,
          navLum: navBg ? lum(navBg) : null,
          ctaLum: ctaC ? lum(ctaC) : null,
          ctaBgLum: ctaBg ? lum(ctaBg) : null,
          iconLum: iconC ? lum(iconC) : null,
          theme: document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme'),
        };
      });
      // Text and bg should differ meaningfully
      if (data.linkLum != null && data.navLum != null) {
        expect(Math.abs(data.linkLum - data.navLum)).toBeGreaterThan(0.15);
      }
      if (data.ctaLum != null && data.ctaBgLum != null) {
        expect(Math.abs(data.ctaLum - data.ctaBgLum)).toBeGreaterThan(0.2);
      }
      if (data.iconLum != null && data.navLum != null) {
        expect(Math.abs(data.iconLum - data.navLum)).toBeGreaterThan(0.12);
      }
      return data;
    }

    // Toggle to ensure both themes visited
    await page.getByRole('button', { name: /Toggle theme/i }).click();
    await page.waitForTimeout(200);
    await themeCheck('toggled-once');

    await page.getByRole('button', { name: /More/i }).click();
    const menu = page.locator('.nav-dropdown-menu');
    await expect(menu).toBeVisible();
    const menuContrast = await menu.evaluate((el) => {
      const a = el.querySelector('a');
      const cs = getComputedStyle(a);
      const bg = getComputedStyle(el).backgroundColor;
      return { color: cs.color, bg };
    });
    expect(menuContrast.color).not.toEqual(menuContrast.bg);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /Toggle theme/i }).click();
    await page.waitForTimeout(200);
    await themeCheck('toggled-twice');
  });

  test('navigation regression', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    const nav = page.getByRole('navigation', { name: 'Main' });

    await nav.locator('.brand').click();
    await expect(page).toHaveURL(/\/$/);

    await nav.getByRole('link', { name: 'Find a Doctor' }).click();
    await expect(page).toHaveURL(/\/doctors/);

    const bookHref = await nav.getByRole('link', { name: 'Book Appointment' }).getAttribute('href');
    expect(bookHref).toMatch(/channeling/);
    await page.goto(bookHref!);
    await expect(page).toHaveURL(/channeling|login/);

    await page.goto('/');
    await nav.getByRole('link', { name: /Shop/i }).click();
    await expect(page).toHaveURL(/\/shop/);

    const cartHref = await nav.getByRole('link', { name: 'Cart' }).getAttribute('href');
    expect(cartHref).toMatch(/cart/);

    await page.goto('/');
    await nav.getByRole('button', { name: /More/i }).click();
    await page.locator('.nav-dropdown-menu').getByRole('menuitem', { name: 'About' }).click();
    await expect(page).toHaveURL(/\/about/);

    await page.goto('/');
    await nav.getByRole('button', { name: /More/i }).click();
    await expect(page.locator('.nav-dropdown-menu').getByRole('menuitem', { name: 'Voice search' })).toBeVisible();
    await page.keyboard.press('Escape');

    await nav.getByRole('button', { name: /Switch language/i }).click();
    await nav.getByRole('button', { name: /Toggle theme/i }).click();
  });
});
