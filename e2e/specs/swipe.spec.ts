import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { TOAST, drag } from './helpers';

// No page.clock here: the gesture machine measures velocity through
// performance.now(), and a mocked clock would stamp every sample with
// the same time. Sticky toasts stand in for the missing clock so
// expiry never races the gesture. The machine's contract: a release
// dismisses past 45px of outward offset or past 0.11 px/ms of
// trailing velocity (80ms window); the default position is
// bottom-right, so the outward directions are right and down.

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

async function showToast(page: Page) {
  await page.getByTestId('sticky').click();
  const toast = page.locator(TOAST);
  await expect(toast).toHaveCount(1);

  // Wait out the enter animation: hover's actionability check parks
  // until the card is visible and stable, so the grabbed box is the
  // settled one. A raw mouse.down against a mid-flight box misses.
  await toast.hover();

  const box = await toast.boundingBox();
  if (!box) {
    throw new Error('The toast has no box to grab');
  }

  return { toast, x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test('a slow drag past the distance threshold dismisses', async ({ page }) => {
  const { toast, x, y } = await showToast(page);

  await drag(page, { x, y }, 120, 0, { steps: 10, settle: true });
  await expect(toast).toHaveCount(0);
});

test('a drag along the other outward edge dismisses too', async ({ page }) => {
  const { toast, x, y } = await showToast(page);

  await drag(page, { x, y }, 0, 55, { steps: 10, settle: true });
  await expect(toast).toHaveCount(0);
});

test('a short drag snaps back after a rest', async ({ page }) => {
  const { toast, x, y } = await showToast(page);

  // 25px is under the 45px distance gate, and the burst itself is
  // over the flick speed: the rest before release must decay it, so
  // the release reads stillness, not the last burst.
  await drag(page, { x, y }, 25, 0, { steps: 10, settle: true });
  await expect(toast).toHaveCount(1);
  await expect(toast).toHaveAttribute('data-phase', 'active');
});

test('an inward drag is refused', async ({ page }) => {
  const { toast, x, y } = await showToast(page);

  await drag(page, { x, y }, -150, 0, { steps: 10, settle: true });
  await expect(toast).toHaveCount(1);
  await expect(toast).toHaveAttribute('data-phase', 'active');
});

test('a flick below the distance threshold dismisses on velocity', async ({
  page,
}) => {
  const { toast, x, y } = await showToast(page);

  // A few large immediate steps: well under 45px of travel, far over
  // 0.11 px/ms within the trailing window.
  await drag(page, { x, y }, 40, 0, { steps: 2 });
  await expect(toast).toHaveCount(0);
});

test('swiping a card out of the expanded stack keeps it expanded', async ({
  page,
}) => {
  await page.getByTestId('sticky').click();
  await page.getByTestId('sticky').click();
  await page.getByTestId('sticky').click();
  const toast = page.locator(TOAST);
  await expect(toast).toHaveCount(3);

  const region = page.locator('[data-cincin-toaster]');
  await page.locator(`${TOAST}[data-front="true"]`).hover();
  await expect(region).toHaveAttribute('data-expanded', 'true');
  // Let the stack finish fanning out: the grabbed box must be the
  // settled one, not a mid-flight frame.
  await page.waitForTimeout(500);

  // The middle card (DOM keeps snapshot order: oldest first).
  const box = await toast.nth(1).boundingBox();
  if (!box) {
    throw new Error('The middle toast has no box to grab');
  }
  await drag(
    page,
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    120,
    0,
    { steps: 10, settle: true }
  );

  await expect(toast).toHaveCount(2);
  // The gesture's trailing mouseleave (pointer capture had suppressed
  // the boundary events until release) must not fold the survivors.
  await page.waitForTimeout(300);
  await expect(region).toHaveAttribute('data-expanded', 'true');
});
