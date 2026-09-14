import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const TOAST = '[data-cincin-toast]';

// Geometry again: the offset is a step inward from the corner, so
// the asserts compare where the card stands with and without it.

async function measure(page: Page, search: string) {
  await page.goto(`/${search}`);
  await page.getByTestId('sticky').click();
  const toast = page.locator(TOAST);
  // Hover's actionability check waits out the card's enter animation,
  // but the region's own slide is a transition of its own, and an
  // adapter that writes the offset after its first paint is still
  // mid-slide at that point. Two identical boxes in a row are the
  // settled one.
  await toast.hover();

  let box = await boxOf(page);
  for (;;) {
    await page.waitForTimeout(50);
    const next = await boxOf(page);
    if (next.x === box.x && next.y === box.y) {
      return next;
    }
    box = next;
  }
}

async function boxOf(page: Page) {
  const box = await page.locator(TOAST).boundingBox();
  if (!box) {
    throw new Error('The toast has no box to measure');
  }

  return box;
}

test('a bare offset lifts a bottom list up', async ({ page }) => {
  const rest = await measure(page, '?position=bottom-right');
  const lifted = await measure(page, '?position=bottom-right&offset=100');

  expect(lifted.y).toBeCloseTo(rest.y - 100, 0);
  expect(lifted.x).toBeCloseTo(rest.x, 0);
});

test('a bare offset drops a top list down', async ({ page }) => {
  const rest = await measure(page, '?position=top-left');
  const dropped = await measure(page, '?position=top-left&offset=100');

  expect(dropped.y).toBeCloseTo(rest.y + 100, 0);
});

test('the horizontal axis steps in from the near edge', async ({ page }) => {
  const rest = await measure(page, '?position=bottom-right');
  const stepped = await measure(page, '?position=bottom-right&offsetX=100');

  expect(stepped.x).toBeCloseTo(rest.x - 100, 0);
  expect(stepped.y).toBeCloseTo(rest.y, 0);

  const left = await measure(page, '?position=bottom-left');
  const leftStepped = await measure(page, '?position=bottom-left&offsetX=100');

  expect(leftStepped.x).toBeCloseTo(left.x + 100, 0);
});

test('a centered list ignores the horizontal axis', async ({ page }) => {
  const rest = await measure(page, '?position=bottom-center');
  const same = await measure(page, '?position=bottom-center&offsetX=100');

  expect(same.x).toBeCloseTo(rest.x, 0);
});

test('both axes step the corner in diagonally', async ({ page }) => {
  const rest = await measure(page, '?position=bottom-right');
  const both = await measure(
    page,
    '?position=bottom-right&offset=60&offsetX=40'
  );

  expect(both.y).toBeCloseTo(rest.y - 60, 0);
  expect(both.x).toBeCloseTo(rest.x - 40, 0);
});

test.describe('on a narrow screen', () => {
  test.use({ viewport: { width: 400, height: 800 } });

  test('only the vertical axis is spent', async ({ page }) => {
    const rest = await measure(page, '?position=bottom-right');
    const both = await measure(
      page,
      '?position=bottom-right&offset=60&offsetX=40'
    );

    expect(both.y).toBeCloseTo(rest.y - 60, 0);
    expect(both.x).toBeCloseTo(rest.x, 0);
    expect(both.width).toBeCloseTo(rest.width, 0);
  });
});
