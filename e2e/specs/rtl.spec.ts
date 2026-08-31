import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { TOAST, drag } from './helpers';

async function showSticky(page: Page, search: string) {
  await page.goto(`/${search}`);
  await page.getByTestId('sticky').click();
  const toast = page.locator(TOAST);
  await expect(toast).toHaveCount(1);
  // Hover's actionability check waits out the enter animation.
  await toast.hover();

  return toast;
}

async function rowCenters(toast: ReturnType<Page['locator']>) {
  // The close button's cross is a [data-cincin-icon] too;
  // the type icon is the card's first one in DOM order.
  const icon = (await toast
    .locator('[data-cincin-icon]')
    .first()
    .boundingBox())!;
  const close = (await toast.locator('[data-cincin-close]').boundingBox())!;

  return {
    icon: icon.x + icon.width / 2,
    close: close.x + close.width / 2,
  };
}

test('the card mirrors its layout under RTL', async ({ page }) => {
  // LTR: the icon leads on the left, the close trails on the right.
  const ltr = await rowCenters(await showSticky(page, ''));
  expect(ltr.icon).toBeLessThan(ltr.close);

  // RTL: the same card, mirrored purely by CSS inheritance.
  const rtl = await rowCenters(await showSticky(page, '?dir=rtl'));
  expect(rtl.icon).toBeGreaterThan(rtl.close);
});

test('under RTL the default swipe follows the mirrored outward edges', async ({
  page,
}) => {
  // The RTL default position is bottom-left:
  // leftward is now outward and rightward is inward.
  const toast = await showSticky(page, '?dir=rtl');
  const box = (await toast.boundingBox())!;
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  await drag(page, from, 120, 0, { steps: 10, settle: true });
  await expect(toast).toHaveCount(1);

  await toast.hover();
  await drag(page, from, -120, 0, { steps: 10, settle: true });
  await expect(toast).toHaveCount(0);
});
