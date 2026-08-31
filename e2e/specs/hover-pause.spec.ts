import { expect, test } from '@playwright/test';

const TOAST = '[data-cincin-toast]';
const REGION = '[data-cincin-toaster]';

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
});

test('hovering pauses expiry and leaving resumes with the remainder', async ({
  page,
}) => {
  await page.getByTestId('message').click();
  const toast = page.locator(TOAST);
  await expect(toast).toHaveCount(1);

  // Burn 2000 of the 4000 budget, then park the pointer on the card.
  await page.clock.fastForward(2000);
  await toast.hover();
  await expect(page.locator(REGION)).toHaveAttribute('data-expanded', 'true');

  // Paused: far past the original expiry, the toast still stands.
  await page.clock.fastForward(10_000);
  await expect(toast).toHaveCount(1);

  // Leave. The clock resumes after the 200ms collapse debounce with
  // about 2000 left, so another 1000 must not expire the toast. This
  // also pins "resume continues": a restarted 4000 budget would slip
  // through both asserts below.
  await page.mouse.move(0, 0);
  await page.clock.fastForward(1200);
  await expect(toast).toHaveCount(1);

  await page.clock.fastForward(2000);
  await expect(toast).toHaveCount(0);
});

test('hover holds the whole stack, not just the hovered card', async ({
  page,
}) => {
  await page.getByTestId('burst').click();
  const toast = page.locator(TOAST);
  await expect(toast).toHaveCount(5);

  // The front card is the only touchable one in a collapsed stack;
  // DOM-first would be a buried, inert back card.
  await page.locator(`${TOAST}[data-front="true"]`).hover();
  await page.clock.fastForward(10_000);
  await expect(toast).toHaveCount(5);

  await page.mouse.move(0, 0);
  await page.clock.fastForward(5000);
  await expect(toast).toHaveCount(0);
});
