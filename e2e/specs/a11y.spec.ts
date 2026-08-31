import { expect, test } from '@playwright/test';
import { TOAST } from './helpers';

// Real time here: focus, blur and the 200ms collapse debounce need
// no clock, and long durations keep expiry out of the frame.

test('the region is a named landmark with list semantics', async ({ page }) => {
  await page.goto('/?duration=60000');
  await page.getByTestId('sticky').click();

  // Attached, not visible: the section is a zero-sized wrapper (the
  // list inside is fixed-positioned), yet the landmark is real.
  const region = page.getByRole('region', { name: 'Notifications' });
  await expect(region).toBeAttached();
  await expect(region.getByRole('list')).toBeAttached();
  await expect(page.getByRole('status')).toContainText('Sticky toast');
});

test('an error toast announces assertively', async ({ page }) => {
  await page.goto('/?duration=60000');
  await page.getByTestId('error').click();

  await expect(page.getByRole('alert')).toContainText('Something broke');
});

test('the collapsed backs are inert and focus expands the stack', async ({
  page,
}) => {
  await page.goto('/?duration=60000');
  await page.getByTestId('burst').click();
  await expect(page.locator(TOAST)).toHaveCount(5);

  // Collapsed: only the front card is reachable, the backs are
  // fenced off from both the tab order and the accessibility tree.
  await expect(page.locator(`${TOAST}[inert]`)).toHaveCount(4);
  await expect(page.locator(`${TOAST}[data-front="true"][inert]`)).toHaveCount(
    0
  );

  // Keyboard arrival mirrors hover: focusing the front card's close
  // control opens the stack and frees the backs for tabbing.
  await page.locator('[data-front="true"] [data-cincin-close]').focus();
  await expect(page.locator('[data-cincin-toaster]')).toHaveAttribute(
    'data-expanded',
    'true'
  );
  await expect(page.locator(`${TOAST}[inert]`)).toHaveCount(0);

  // Focus leaving the region collapses it back (past the debounce).
  await page.getByTestId('message').focus();
  await expect(page.locator('[data-cincin-toaster]')).toHaveAttribute(
    'data-expanded',
    'false'
  );
  await expect(page.locator(`${TOAST}[inert]`)).toHaveCount(4);
});

test('the close button carries its label and works from the keyboard', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('sticky').click();
  await expect(page.locator(TOAST)).toHaveCount(1);

  const close = page.getByRole('button', { name: 'Dismiss', exact: true });
  await close.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(TOAST)).toHaveCount(0);
});
