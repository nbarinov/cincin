import type { Page } from '@playwright/test';

/** The skin's stable hook for a toast card, shared by both adapters. */
const TOAST = '[data-cincin-toast]';

type DragOptions = {
  steps: number;
  stepDelay?: number;
  settle?: boolean;
};

async function drag(
  page: Page,
  from: { x: number; y: number },
  dx: number,
  dy: number,
  { steps, stepDelay = 0, settle = false }: DragOptions
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i += 1) {
    await page.mouse.move(from.x + (dx * i) / steps, from.y + (dy * i) / steps);
    if (stepDelay > 0) {
      await page.waitForTimeout(stepDelay);
    }
  }
  if (settle) {
    await page.waitForTimeout(150);
  }
  await page.mouse.up();
}

export { TOAST, drag };
