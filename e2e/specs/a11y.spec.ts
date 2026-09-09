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

test('tab reaches the card before its cross and hears the title', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('sticky').click();
  await expect(page.locator(TOAST)).toHaveCount(1);

  // Land on the card first: a screen reader hears the toast, not just
  // "Dismiss, button".
  const card = page.getByRole('status', { name: 'Sticky toast' });
  await card.focus();
  await expect(card).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Dismiss', exact: true })
  ).toBeFocused();
});

test('the front toast comes first: Tab from the page enters the newest', async ({
  page,
}) => {
  await page.goto('/?duration=60000');
  await page.getByTestId('message').click();
  await page.getByTestId('message').click();
  await expect(page.locator(TOAST)).toHaveCount(2);

  // The region follows the page's controls in the DOM.
  await page.getByTestId('dismiss-all').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('status', { name: 'Toast #2' })).toBeFocused();
});

test('the hotkey lands on the front toast and Escape hands focus back', async ({
  page,
}) => {
  await page.goto('/?duration=60000');
  await page.getByTestId('sticky').click();
  await expect(page.locator(TOAST)).toHaveCount(1);

  const origin = page.getByTestId('sticky');
  await origin.focus();
  await page.keyboard.press('Alt+t');
  await expect(
    page.getByRole('status', { name: 'Sticky toast' })
  ).toBeFocused();
  await expect(page.locator('[data-cincin-toaster]')).toHaveAttribute(
    'data-expanded',
    'true'
  );

  await page.keyboard.press('Escape');
  await expect(origin).toBeFocused();
  await expect(page.locator('[data-cincin-toaster]')).toHaveAttribute(
    'data-expanded',
    'false'
  );
});

test('closing a toast from the keyboard passes the focus to the next one', async ({
  page,
}) => {
  await page.goto('/?duration=60000');
  await page.getByTestId('message').click();
  await page.getByTestId('message').click();
  await expect(page.locator(TOAST)).toHaveCount(2);

  await page.keyboard.press('Alt+t');
  await expect(page.getByRole('status', { name: 'Toast #2' })).toBeFocused();

  // Tab onto the cross, Enter closes the toast under focus.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status', { name: 'Toast #1' })).toBeFocused();
  await expect(page.locator('[data-cincin-toaster]')).toHaveAttribute(
    'data-expanded',
    'true'
  );
});
