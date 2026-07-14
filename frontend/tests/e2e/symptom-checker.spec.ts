import { test, expect } from '@playwright/test';

test.describe('Symptom Checker E2E', () => {
  test('user can input symptoms, click analyze, and see mocked results deterministically', async ({ page }) => {
    // 1. Intercept the API and provide a deterministic mock response.
    // This adheres to the Test Automation Engineer rule: "Tests own their data."
    await page.route('**/api/symptom-check', async (route) => {
      const json = {
        analysis: 'Test Ayurvedic Analysis: This is a mocked analysis to ensure deterministic testing without relying on third-party live AI services.',
        remedies: ['Drink warm ginger tea', 'Apply eucalyptus oil'],
        doctors: [],
        products: []
      };
      await route.fulfill({ json });
    });

    // 2. Navigate to the Symptom Checker page
    await page.goto('/symptom-checker');

    // 2.5 Select language to dismiss the overlay
    const englishBtn = page.locator('.lang-btn', { hasText: 'English' });
    await englishBtn.waitFor({ state: 'visible' });
    await englishBtn.click();
    
    // Wait for the overlay to completely disappear
    await expect(page.locator('.language-overlay')).toBeHidden();

    // 3. Interact with the UI using Role-based selectors (survives redesigns)
    const textarea = page.getByRole('textbox', { name: 'Describe your symptoms textarea' });
    await expect(textarea).toBeVisible();

    // The user clicks a quick tag
    await page.getByRole('button', { name: 'Select symptom: Headache / හිසරුදාව' }).click();

    // Verify textarea is populated correctly
    await expect(textarea).toHaveValue('Headache / හිසරුදාව');

    // 4. Submit the form
    const analyzeBtn = page.getByRole('button', { name: 'Analyze with AI' });
    
    // Setup the response promise BEFORE clicking to avoid race conditions. No hard sleeps!
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/symptom-check') && response.status() === 200
    );
    
    await analyzeBtn.click();
    
    // Wait for the response network request to complete.
    await responsePromise;

    // 5. Verify the results render correctly (Web-first assertions)
    await expect(page.getByText('Test Ayurvedic Analysis: This is a mocked analysis')).toBeVisible();
    await expect(page.getByText('Drink warm ginger tea')).toBeVisible();
  });
});
