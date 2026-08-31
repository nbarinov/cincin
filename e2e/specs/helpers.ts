import type { Page } from '@playwright/test';

/** The skin's stable hook for a toast card, shared by both adapters. */
const TOAST = '[data-cincin-toast]';

type DragOptions = {
  steps: number;
  /** Pause between steps, ms: stretches the drag in time so the
   * trailing velocity stays under the flick threshold. */
  stepDelay?: number;
  /** Rest before release. NOTE: velocity is measured over the last
   * movement burst, so resting does not decay it; only a slow drag
   * (stepDelay) keeps a release below the flick threshold. */
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
