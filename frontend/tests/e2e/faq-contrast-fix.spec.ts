import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = '/opt/cursor/artifacts/faq-contrast-fix';

function luminance(rgb: string): number {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return 0;
  const [r, g, b] = [m[1], m[2], m[3]].map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const L1 = luminance(a);
  const L2 = luminance(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

async function gotoFaq(page: Page, lang: 'en' | 'si' | 'ta', theme: 'light' | 'dark') {
  await page.addInitScript(
    ({ l, th }) => {
      localStorage.setItem('appLang', l);
      localStorage.setItem('appTheme', th);
    },
    { l: lang, th: theme }
  );
  await page.goto('/faq', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.querySelectorAll('.language-overlay').forEach((el) => el.remove());
  });
  await expect(page.locator('html')).toHaveAttribute('lang', lang, { timeout: 15000 });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme, { timeout: 15000 });
  await expect(page.locator('.faq-list details').first()).toBeVisible();
}

async function shot(page: Page, name: string) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, `${name}.png`), fullPage: false });
}

test.describe('FAQ contrast fix', () => {
  for (const theme of ['dark', 'light'] as const) {
    for (const lang of ['en', 'si', 'ta'] as const) {
      test(`${theme} ${lang} readable accordion`, async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await gotoFaq(page, lang, theme);

        const metrics = await page.evaluate(() => {
          const details = document.querySelector('.faq-list details') as HTMLElement;
          const summary = document.querySelector('.faq-list summary') as HTMLElement;
          const lead = document.querySelector('.pub-lead') as HTMLElement;
          const answer = document.querySelector('.faq-list details p') as HTMLElement;
          const cs = (el: Element | null) => {
            if (!el) return null;
            const s = getComputedStyle(el);
            return { color: s.color, bg: s.backgroundColor, opacity: s.opacity };
          };
          return {
            details: cs(details),
            summary: cs(summary),
            lead: cs(lead),
            answer: cs(answer),
            surfaceToken: getComputedStyle(document.documentElement)
              .getPropertyValue('--surface-color')
              .trim(),
          };
        });

        expect(metrics.summary?.opacity).toBe('1');
        expect(metrics.details?.bg).not.toBe('rgba(0, 0, 0, 0)');

        // summary text vs card background
        const qRatio = contrastRatio(metrics.summary!.color, metrics.details!.bg);
        expect(qRatio, `question contrast ${theme}/${lang}: ${qRatio}`).toBeGreaterThanOrEqual(4.5);

        // subtitle vs page (hero) — use lead color vs body bg
        const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        const leadRatio = contrastRatio(metrics.lead!.color, bodyBg);
        expect(leadRatio, `lead contrast ${theme}/${lang}: ${leadRatio}`).toBeGreaterThanOrEqual(3.5);

        // expand and check answer
        await page.locator('.faq-list details').first().locator('summary').click();
        await expect(page.locator('.faq-list details[open] p').first()).toBeVisible();
        const openMetrics = await page.evaluate(() => {
          const details = document.querySelector('.faq-list details[open]') as HTMLElement;
          const answer = details?.querySelector('p') as HTMLElement;
          const s = getComputedStyle(answer);
          const d = getComputedStyle(details);
          return { color: s.color, bg: d.backgroundColor, opacity: s.opacity };
        });
        expect(openMetrics.opacity).toBe('1');
        const aRatio = contrastRatio(openMetrics.color, openMetrics.bg);
        expect(aRatio, `answer contrast ${theme}/${lang}: ${aRatio}`).toBeGreaterThanOrEqual(4.0);

        if (lang === 'si' || lang === 'ta') {
          await shot(page, `faq-${theme}-${lang}-1440`);
        }
      });
    }
  }

  for (const w of [390, 375, 320]) {
    test(`SI dark mobile @ ${w}`, async ({ page }) => {
      await gotoFaq(page, 'si', 'dark');
      await page.setViewportSize({ width: w, height: 844 });
      // re-assert theme after resize
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      const overflow = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      expect(overflow.sw).toBeLessThanOrEqual(overflow.cw + 2);
      const ratio = await page.evaluate(() => {
        const details = document.querySelector('.faq-list details') as HTMLElement;
        const summary = document.querySelector('.faq-list summary') as HTMLElement;
        const ds = getComputedStyle(details);
        const ss = getComputedStyle(summary);
        const parse = (rgb: string) => {
          const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (!m) return 0;
          const ch = [m[1], m[2], m[3]].map((v) => {
            const c = Number(v) / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
        };
        const L1 = parse(ss.color);
        const L2 = parse(ds.backgroundColor);
        const hi = Math.max(L1, L2);
        const lo = Math.min(L1, L2);
        return (hi + 0.05) / (lo + 0.05);
      });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      await shot(page, `faq-dark-si-${w}`);
    });
  }
});
