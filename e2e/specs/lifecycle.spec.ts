import { expect, test } from '@playwright/test';

const TOAST = '[data-cincin-toast]';

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
});

test('a toast appears and expires after the default duration', async ({
  page,
}) => {
  await page.getByTestId('message').click();

  const toast = page.locator(TOAST);
  await expect(toast).toHaveCount(1);
  await expect(toast).toContainText('Toast #1');

  // Default duration is 4000ms; run past it and let the exit finish.
  await page.clock.fastForward(5000);
  await expect(toast).toHaveCount(0);
});

test('a sticky toast outlives the clock and leaves on dismiss', async ({
  page,
}) => {
  await page.getByTestId('sticky').click();

  const toast = page.locator(TOAST);
  await expect(toast).toHaveCount(1);

  await page.clock.fastForward(60_000);
  await expect(toast).toHaveCount(1);

  await page.getByTestId('dismiss-all').click();
  await expect(toast).toHaveCount(0);
});

test('a burst renders every toast', async ({ page }) => {
  await page.getByTestId('burst').click();

  await expect(page.locator(TOAST)).toHaveCount(5);
});
