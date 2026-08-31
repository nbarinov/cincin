import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const TOAST = '[data-cincin-toast]';

// Geometry over attributes: data-y/data-x on the region would only
// echo the prop parsing, so the asserts read where the card actually
// stands in the viewport.

type XSide = 'left' | 'center' | 'right';
type YSide = 'top' | 'bottom';

async function measure(page: Page, search: string) {
  await page.goto(`/${search}`);
  await page.getByTestId('sticky').click();
  const toast = page.locator(TOAST);
  // Hover's actionability check waits out the enter animation, so
  // the measured box is the settled one.
  await toast.hover();

  const box = await toast.boundingBox();
  if (!box) {
    throw new Error('The toast has no box to measure');
  }

  return { box, viewport: page.viewportSize()! };
}

function expectAt(
  { box, viewport }: Awaited<ReturnType<typeof measure>>,
  xSide: XSide,
  ySide: YSide
) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  if (xSide === 'left') {
    expect(cx).toBeLessThan(viewport.width / 3);
  } else if (xSide === 'right') {
    expect(cx).toBeGreaterThan((viewport.width * 2) / 3);
  } else {
    expect(Math.abs(cx - viewport.width / 2)).toBeLessThan(50);
  }

  if (ySide === 'top') {
    expect(cy).toBeLessThan(viewport.height / 2);
  } else {
    expect(cy).toBeGreaterThan(viewport.height / 2);
  }
}

const POSITIONS: Array<[position: string, x: XSide, y: YSide]> = [
  ['top-left', 'left', 'top'],
  ['top-center', 'center', 'top'],
  ['top-right', 'right', 'top'],
  ['bottom-left', 'left', 'bottom'],
  ['bottom-center', 'center', 'bottom'],
  ['bottom-right', 'right', 'bottom'],
];

for (const [position, xSide, ySide] of POSITIONS) {
  test(`position ${position} stands in its corner`, async ({ page }) => {
    expectAt(await measure(page, `?position=${position}`), xSide, ySide);
  });
}

test('the default position is the bottom inline-end corner', async ({
  page,
}) => {
  expectAt(await measure(page, ''), 'right', 'bottom');
});

test('under RTL the default mirrors to bottom-left', async ({ page }) => {
  expectAt(await measure(page, '?dir=rtl'), 'left', 'bottom');
});

test('an explicit position is physical and final under RTL', async ({
  page,
}) => {
  expectAt(
    await measure(page, '?position=bottom-right&dir=rtl'),
    'right',
    'bottom'
  );
});
