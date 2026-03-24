const { test, expect } = require('@playwright/test');

async function drawSignature(page) {
  const canvas = page.getByTestId('signature-canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Signature canvas is not available');
  }

  await page.mouse.move(box.x + 30, box.y + 35);
  await page.mouse.down();
  await page.mouse.move(box.x + 110, box.y + 75, { steps: 10 });
  await page.mouse.move(box.x + 190, box.y + 45, { steps: 10 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Save' }).click();
}

test('auth gate, create pre-start, sync across tabs, and delete form', async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();
  const appUrl = `${baseURL}/?e2e=1`;

  await pageA.goto(appUrl);
  await expect(pageA.getByText('First Time Setup')).toBeVisible();
  await pageA.getByLabel('Device Name').fill('E2E Admin Device');
  await pageA.getByLabel('Set App Password').fill('SafetyPass123');
  await pageA.getByLabel('Confirm Password').fill('SafetyPass123');
  await pageA.getByRole('button', { name: /Complete Setup/i }).click();
  await expect(pageA.getByText('Welcome Back!')).toBeVisible();

  await pageB.goto(appUrl);
  await expect(pageB.getByText('Enter password to access')).toBeVisible();
  await pageB.getByLabel('Device Name (optional)').fill('E2E Observer Tab');
  await pageB.getByLabel('Password').fill('SafetyPass123');
  await pageB.getByRole('button', { name: /Enter App/i }).click();
  await expect(pageB.getByText('Welcome Back!')).toBeVisible();

  await pageA.getByRole('button', { name: 'Pre-Start' }).first().click();
  await pageA.getByRole('button', { name: /Site Pre-Start/i }).click();

  await pageA.getByLabel('Supervisor Name').selectOption('Jeff Fu');
  await pageA.getByLabel('Site Conducted').selectOption('Site 1 - Sydney CBD');
  await pageA.getByLabel('Builder').selectOption('Built');
  await pageA.getByLabel('Address').fill('123 Safety Street, Sydney NSW');
  await pageA.getByLabel('Site Specific Hazards').fill('Overhead steel installation and moving plant nearby.');

  await pageA.getByLabel('Plant Equipment No').click();
  await pageA.getByLabel('High Risk Works No').click();
  await pageA.getByLabel('SWMS Covered Yes').click();
  const checklistPassButtons = pageA.locator('button[aria-label$=" pass"]');
  const checklistPassCount = await checklistPassButtons.count();
  for (let index = 0; index < checklistPassCount; index += 1) {
    const button = checklistPassButtons.nth(index);
    await button.scrollIntoViewIfNeeded();
    await button.click();
  }

  const nextButton = pageA.getByRole('button', { name: /Next: Worker Sign-On/i });
  await expect(nextButton).toBeEnabled();
  await nextButton.click();

  await pageA.getByLabel('Sign Jeff Fu').click();
  await drawSignature(pageA);
  await pageA.getByRole('button', { name: /Complete Pre-Start/i }).click();
  await expect(pageA.getByText('Form Submitted!')).toBeVisible();
  await pageA.getByRole('button', { name: /Back to Dashboard/i }).click();
  await expect(pageA.getByText('Welcome Back!')).toBeVisible();

  await expect.poll(async () => await pageB.locator('button').filter({ hasText: 'Site 1 - Sydney CBD' }).count()).toBe(1);
  const syncedForm = pageB.locator('button').filter({ hasText: 'Site 1 - Sydney CBD' }).first();
  await expect(syncedForm).toBeVisible();

  await syncedForm.click();
  await pageB.getByRole('button', { name: /Delete Form/i }).click();
  await pageB.getByRole('button', { name: /Delete Permanently/i }).click();

  const deletedFormCardA = pageA.locator('button').filter({ hasText: 'Site 1 - Sydney CBD' });
  const deletedFormCardB = pageB.locator('button').filter({ hasText: 'Site 1 - Sydney CBD' });
  await expect(deletedFormCardA).toHaveCount(0);
  await expect(deletedFormCardB).toHaveCount(0);

  await context.close();
});
