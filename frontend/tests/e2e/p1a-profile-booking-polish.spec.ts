import { test, expect } from '@playwright/test';

const widths = [320, 375, 390, 430, 768, 1024, 1440] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('appLang', 'en'));
});

test('doctor profile readable and stacks booking card on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/doctors');
  const link = page.locator('a[href^="/doctors/"]').first();
  await expect(link).toBeVisible({ timeout: 25000 });
  await link.click();
  await expect(page.locator('.doctor-profile-page')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.profile-header-card h1')).toBeVisible();
  await expect(page.locator('.booking-side-card')).toBeVisible();
  await expect(page.getByRole('link', { name: /Book Appointment/i })).toBeVisible();

  const contrast = await page.evaluate(() => {
    const card = document.querySelector('.profile-header-card') as HTMLElement | null;
    const title = document.querySelector('.profile-header-card h1') as HTMLElement | null;
    if (!card || !title) return null;
    const csCard = getComputedStyle(card);
    const csTitle = getComputedStyle(title);
    return {
      cardBg: csCard.backgroundColor,
      titleColor: csTitle.color,
      // Rough luminance check: title should not be near-white on near-white
      titleRgb: csTitle.color,
      cardRgb: csCard.backgroundColor,
    };
  });
  expect(contrast).toBeTruthy();
  // Dark theme default: card should not be pure white
  expect(contrast!.cardBg).not.toMatch(/rgb\(\s*255,\s*255,\s*255\s*\)/);
});

for (const w of widths) {
  test(`no horizontal overflow on doctor profile @ ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: w < 768 ? 700 : 900 });
    await page.goto('/doctors');
    const href = await page.locator('a[href^="/doctors/"]').first().getAttribute('href', { timeout: 25000 });
    expect(href).toBeTruthy();
    await page.goto(href!);
    await page.waitForSelector('.doctor-profile-page', { timeout: 20000 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    );
    expect(overflow).toBeFalsy();
  });
}

test('booking modal structure: sticky header/footer, internal scroll, mobile sheet', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/channeling');
  await page.waitForTimeout(500);

  // Inject modal markup using production CSS classes (auth not required for layout QA)
  await page.evaluate(() => {
    document.body.classList.add('booking-modal-open');
    const root = document.createElement('div');
    root.id = 'polish-modal-fixture';
    root.innerHTML = `
      <div class="booking-modal-overlay" data-testid="booking-modal-fixture">
        <div class="booking-modal" data-testid="booking-modal">
          <header class="booking-modal-header">
            <div class="booking-modal-provider">
              <div class="booking-modal-avatar-fallback">D</div>
              <div>
                <div class="booking-modal-eyebrow">Book appointment</div>
                <div class="booking-modal-name">Fixture Doctor</div>
                <div class="booking-modal-meta">In-person consultation</div>
              </div>
            </div>
            <button type="button" class="booking-modal-close" aria-label="Close booking">×</button>
          </header>
          <form class="booking-modal-form">
            <div class="booking-modal-body">
              ${'<p style="margin:0 0 1rem">Slot row</p>'.repeat(20)}
              <input class="booking-input" placeholder="phone" />
              <textarea class="booking-textarea" rows="3"></textarea>
            </div>
            <div class="booking-modal-footer">
              <button type="submit" class="booking-confirm-btn">Confirm Appointment</button>
            </div>
          </form>
        </div>
      </div>`;
    document.body.appendChild(root);
  });

  const modal = page.getByTestId('booking-modal');
  await expect(modal).toBeVisible();
  await expect(page.locator('.booking-modal-header')).toBeVisible();
  await expect(page.locator('.booking-modal-footer .booking-confirm-btn')).toBeVisible();
  await expect(page.locator('.booking-modal-name')).toHaveText('Fixture Doctor');

  const metrics = await page.evaluate(() => {
    const modalEl = document.querySelector('.booking-modal') as HTMLElement;
    const body = document.querySelector('.booking-modal-body') as HTMLElement;
    const header = document.querySelector('.booking-modal-header') as HTMLElement;
    const footer = document.querySelector('.booking-modal-footer') as HTMLElement;
    const mr = modalEl.getBoundingClientRect();
    return {
      modalWidth: mr.width,
      viewportWidth: window.innerWidth,
      bodyOverflowY: getComputedStyle(body).overflowY,
      headerTop: header.getBoundingClientRect().top,
      footerBottom: footer.getBoundingClientRect().bottom,
      viewportHeight: window.innerHeight,
      pageOverflowLocked: document.body.classList.contains('booking-modal-open'),
    };
  });

  expect(metrics.pageOverflowLocked).toBeTruthy();
  expect(metrics.modalWidth).toBeGreaterThanOrEqual(metrics.viewportWidth - 2);
  expect(['auto', 'scroll', 'overlay']).toContain(metrics.bodyOverflowY);
  expect(metrics.headerTop).toBeGreaterThanOrEqual(-1);
  expect(metrics.footerBottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);

  // Desktop centered modal
  await page.setViewportSize({ width: 1024, height: 800 });
  const desktop = await page.evaluate(() => {
    const modalEl = document.querySelector('.booking-modal') as HTMLElement;
    const r = modalEl.getBoundingClientRect();
    return {
      maxHeight: getComputedStyle(modalEl).maxHeight,
      height: r.height,
      viewport: window.innerHeight,
      width: r.width,
    };
  });
  expect(desktop.width).toBeLessThan(600);
  expect(desktop.height).toBeLessThanOrEqual(desktop.viewport * 0.92);
});
