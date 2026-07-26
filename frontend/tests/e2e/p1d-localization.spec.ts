import { test, expect } from '@playwright/test';

/**
 * P1-D localization coverage — forces appLang and asserts representative strings.
 */

async function gotoWithLang(page, path: string, lang: 'en' | 'si' | 'ta') {
  await page.addInitScript((l) => {
    localStorage.setItem('appLang', l);
  }, lang);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('lang', lang, { timeout: 10000 });
}

test.describe('P1-D EN/SI/TA localization', () => {
  test('Home EN shows Find a Doctor', async ({ page }) => {
    await gotoWithLang(page, '/', 'en');
    await expect(page.locator('body')).toContainText('Find a Doctor');
  });

  test('Home SI shows Sinhala find-doctor CTA', async ({ page }) => {
    await gotoWithLang(page, '/', 'si');
    await expect(page.locator('body')).toContainText('වෛද්‍යවරයෙකු සොයන්න');
  });

  test('Home TA shows Tamil find-doctor CTA', async ({ page }) => {
    await gotoWithLang(page, '/', 'ta');
    await expect(page.locator('body')).toContainText('மருத்துவரைத் தேடுங்கள்');
  });

  test('Navbar Book Appointment SI', async ({ page }) => {
    await gotoWithLang(page, '/', 'si');
    await expect(page.locator('body')).toContainText('වෛද්‍ය හමුවක් වෙන්කරවා ගන්න');
  });

  test('Navbar Book Appointment TA', async ({ page }) => {
    await gotoWithLang(page, '/', 'ta');
    await expect(page.locator('body')).toContainText('மருத்துவர் சந்திப்பை முன்பதிவு செய்யுங்கள்');
  });

  test('Doctors page SI badge', async ({ page }) => {
    await gotoWithLang(page, '/doctors', 'si');
    await expect(page.locator('body')).toContainText('Deergayu අනුමත');
  });

  test('Doctor profile chrome localizes (not provider name)', async ({ page }) => {
    await gotoWithLang(page, '/doctors/dr-p-h-s-gaya', 'ta');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Gaya/i);
    await expect(page.locator('body')).toContainText('Deergayu அங்கீகரிக்கப்பட்டது');
  });

  test('language persists across navigation', async ({ page }) => {
    await gotoWithLang(page, '/', 'si');
    await page.goto('/doctors', { waitUntil: 'domcontentloaded' });
    await page.goto('/channeling', { waitUntil: 'domcontentloaded' });
    const lang = await page.evaluate(() => localStorage.getItem('appLang'));
    expect(lang).toBe('si');
    await expect(page.locator('html')).toHaveAttribute('lang', 'si');
  });

  test('Astrology homepage section SI has no raw keys', async ({ page }) => {
    await gotoWithLang(page, '/', 'si');
    await expect(page.locator('body')).not.toContainText('home_birth_chart');
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator('body')).not.toContainText('[object Object]');
  });

  test('toggle language updates UI without losing route', async ({ page }) => {
    await gotoWithLang(page, '/doctors', 'en');
    await page.getByRole('button', { name: /switch language/i }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'si');
    await expect(page).toHaveURL(/\/doctors/);
    await expect(page.locator('body')).toContainText('Deergayu අනුමත');
  });
});
