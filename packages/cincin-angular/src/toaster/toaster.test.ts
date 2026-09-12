import { TestBed } from '@angular/core/testing';
import { fireEvent, render, screen } from '@testing-library/angular';
import { createToaster } from 'cincin';
import type { Toaster as ToasterContract } from 'cincin';
import type { SwipeDirection } from 'cincin/dom';
import type { ToasterPosition } from 'cincin-skin';
import { provideToaster } from './context';
import { Toaster } from './toaster';
import type { ToastAction, ToastContent, ToasterLabels } from './content';

type Inputs = {
  labels?: ToasterLabels;
  position?: ToasterPosition;
  swipeDirections?: readonly SwipeDirection[];
};

async function setup(
  inputs: Inputs = {}
): Promise<ToasterContract<ToastContent>> {
  const toaster = createToaster<ToastContent>();
  await render(Toaster, { providers: [provideToaster(toaster)], inputs });
  return toaster;
}

function getCards(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-cincin-toast]')];
}

function getCard(index = 0): HTMLElement {
  const card = getCards()[index];
  if (card === undefined) {
    throw new Error(`card ${index} not rendered`);
  }
  return card;
}

function getRegion(): HTMLElement {
  const region = document.querySelector<HTMLElement>('[data-cincin-toaster]');
  if (region === null) {
    throw new Error('region not rendered');
  }
  return region;
}

function query<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`${selector} not rendered`);
  }
  return element;
}

/** One tick is the whole story: the render registers the cards, the
 * layout pass writes their slots, and the tick loop paints the
 * slot-driven attributes before it returns. */
function settle(): void {
  TestBed.tick();
}

beforeEach(() => {
  // Timer functions only: the collapse delay rides setTimeout, and
  // nothing else should freeze. Change detection is driven by hand
  // through `settle`, so the faked scheduler timers never matter.
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Toaster a11y', () => {
  it('should name the region landmark and keep the list role under it', async () => {
    const toaster = await setup();

    toaster.message({ title: 'hi' });
    settle();

    const landmark = query(document, 'section[aria-label="Notifications"]');
    // The landmark wraps the list instead of replacing its role: the
    // screen reader keeps both the region and "list, N items".
    expect(landmark.contains(getRegion())).toBe(true);
    expect(getRegion().hasAttribute('role')).toBe(false);
  });

  it('should speak the labels input on the landmark and the close button', async () => {
    const toaster = await setup({
      labels: { region: 'Alerts', close: 'Close' },
    });

    toaster.message({ title: 'hi' });
    settle();

    expect(document.querySelector('section[aria-label="Alerts"]')).not.toBe(
      null
    );
    const close = query(getRegion(), '[data-cincin-close]');
    expect(close.getAttribute('aria-label')).toBe('Close');
  });

  it('should make the card a tab stop named by its title', async () => {
    const toaster = await setup();
    toaster.message({ title: 'Saved', description: 'Two copies kept' });
    settle();

    const card = screen.getByRole('status', {
      name: 'Saved',
      description: 'Two copies kept',
    });
    expect(card).toBe(getCard());
    expect(card.tabIndex).toBe(0);
  });

  it('should name a lone-title card the same way', async () => {
    const toaster = await setup();
    toaster.message({ title: 'Saved' });
    settle();

    const card = screen.getByRole('status', { name: 'Saved' });
    expect(card).toBe(getCard());
    expect(card.hasAttribute('aria-describedby')).toBe(false);
  });

  it('should keep collapsed back cards inert and the front card live', async () => {
    const toaster = await setup();

    toaster.message({ title: 'old' });
    toaster.message({ title: 'new' });
    settle();

    // DOM order is stack order: the front card first, the oldest last.
    const [front, back] = [getCard(0), getCard(1)];
    expect(back.hasAttribute('inert')).toBe(true);
    expect(front.hasAttribute('inert')).toBe(false);
  });

  it('should expand on focus and let the back cards join the tab order', async () => {
    const toaster = await setup();

    toaster.message({ title: 'old' });
    toaster.message({ title: 'new' });
    settle();

    const [front, back] = [getCard(0), getCard(1)];
    query<HTMLElement>(front, '[data-cincin-close]').focus();
    settle();

    expect(getRegion().dataset['expanded']).toBe('true');
    expect(back.hasAttribute('inert')).toBe(false);
  });

  it('should collapse after focus leaves and re-inert the backs', async () => {
    const toaster = await setup();

    toaster.message({ title: 'old' });
    toaster.message({ title: 'new' });
    settle();

    const [front, back] = [getCard(0), getCard(1)];
    const close = query<HTMLElement>(front, '[data-cincin-close]');
    close.focus();
    settle();
    close.blur();
    settle();

    // The collapse waits out its delay before folding the stack back.
    expect(getRegion().dataset['expanded']).toBe('true');
    vi.advanceTimersByTime(200);
    settle();

    expect(getRegion().dataset['expanded']).toBe('false');
    expect(back.hasAttribute('inert')).toBe(true);
  });

  it('should keep a leaving ghost inert even while expanded', async () => {
    const toaster = await setup();

    toaster.message({ title: 'old' });
    const id = toaster.message({ title: 'new' });
    settle();

    const front = getCard(0);
    query<HTMLElement>(front, '[data-cincin-close]').focus();
    settle();
    toaster.remove(id);
    settle();

    expect(getRegion().dataset['expanded']).toBe('true');
    expect(front.dataset['phase']).toBe('leaving');
    expect(front.hasAttribute('inert')).toBe(true);
  });

  it('should tab the cross before the action, as the card reads', async () => {
    const toaster = await setup();

    toaster.error({
      title: 'Something broke',
      description: 'The request did not survive the round trip.',
      actions: [{ label: 'Retry', onClick: () => {} }],
    });
    settle();

    // The grid puts the cross in the first row and the action in the
    // second: the markup has to agree, or the tab sequence walks the
    // card bottom to top.
    const order = [...getCard().querySelectorAll('button')].map((button) =>
      button.hasAttribute('data-cincin-close') ? 'close' : 'action'
    );

    expect(order).toEqual(['close', 'action']);
  });
});

describe('Toaster region hover', () => {
  it('should stay expanded through the trailing mouseleave of a swipe', async () => {
    const toaster = await setup();

    toaster.message({ title: 'old' });
    toaster.message({ title: 'new' });
    settle();

    const region = getRegion();
    fireEvent.mouseMove(region);
    expect(region.dataset['expanded']).toBe('true');

    // A captured swipe suppresses boundary events, so the browser
    // recomputes hover only on release: lostpointercapture first,
    // then the gesture's own mouseleave, both after pointerup.
    fireEvent.pointerDown(region);
    fireEvent.pointerUp(region);
    fireEvent(region, new Event('lostpointercapture', { bubbles: true }));
    fireEvent.mouseLeave(region);
    vi.advanceTimersByTime(200);
    settle();
    expect(region.dataset['expanded']).toBe('true');

    // The swallow is one-shot: a genuine enter/leave still folds.
    fireEvent.mouseMove(region);
    fireEvent.mouseLeave(region);
    vi.advanceTimersByTime(200);
    settle();
    expect(region.dataset['expanded']).toBe('false');
  });
});

describe('Toaster actions', () => {
  function getActions(card: HTMLElement): HTMLElement[] {
    return [...card.querySelectorAll<HTMLElement>('[data-cincin-action]')];
  }

  function clickAction(card: HTMLElement, index = 0): void {
    const action = getActions(card)[index];
    if (action === undefined) {
      throw new Error(`action ${index} not rendered`);
    }
    fireEvent.click(action);
    settle();
  }

  async function setupWithAction(
    onClick: ToastAction['onClick']
  ): Promise<HTMLElement> {
    const toaster = await setup();

    toaster.message({
      title: 'archived',
      actions: [{ label: 'Undo', onClick }],
    });
    settle();

    return getCard();
  }

  async function setupWithPair(
    onSecond: ToastAction['onClick']
  ): Promise<HTMLElement> {
    const toaster = await setup();

    toaster.message({
      title: 'Invitation',
      description: 'Anna asked to join the workspace.',
      actions: [
        { label: 'Decline', variant: 'secondary', onClick: () => {} },
        { label: 'Accept', onClick: onSecond },
      ],
    });
    settle();

    return getCard();
  }

  it('should dismiss the toast after the action click', async () => {
    const card = await setupWithAction(() => {});
    clickAction(card);

    expect(card.dataset['phase']).toBe('leaving');
  });

  it('should keep the toast when the handler prevents the click', async () => {
    const card = await setupWithAction((event) => event.preventDefault());
    clickAction(card);

    expect(card.dataset['phase']).toBe('active');
  });

  it('should render a pair in the tuple order and default to primary', async () => {
    const card = await setupWithPair(() => {});

    // The skin never reorders: the caller owns the layout, and the
    // variant, not the position, says which one is loud.
    expect(
      getActions(card).map((button) => [
        button.textContent?.trim(),
        button.dataset['variant'],
      ])
    ).toEqual([
      ['Decline', 'secondary'],
      ['Accept', 'primary'],
    ]);
  });

  it('should let the second button dismiss on the same rule', async () => {
    const onAccept = vi.fn();
    const card = await setupWithPair(onAccept);
    clickAction(card, 1);

    expect(onAccept).toHaveBeenCalledOnce();
    expect(card.dataset['phase']).toBe('leaving');
  });

  it('should keep the toast when the second handler prevents the click', async () => {
    const card = await setupWithPair((event) => event.preventDefault());
    clickAction(card, 1);

    expect(card.dataset['phase']).toBe('active');
  });
});

describe('Toaster close button', () => {
  function getClose(card: HTMLElement): HTMLElement | null {
    return card.querySelector<HTMLElement>('[data-cincin-close]');
  }

  it('should keep the cross by default', async () => {
    const toaster = await setup();

    toaster.message({ title: 'archived' });
    settle();

    expect(getClose(getCard())).not.toBeNull();
  });

  it('should drop the cross while the toast stays dismissible', async () => {
    const toaster = await setup();

    toaster.message({ title: 'archived', closeButton: false });
    settle();

    const card = getCard();

    // Chrome only: the permission is untouched, so the swipe controller
    // is still attached and still claims its cross axis.
    expect(getClose(card)).toBeNull();
    expect(card.dataset['dismissible']).toBe('true');
    expect(card.style.touchAction).toBe('none');
  });

  it('should not bring the cross back on a non-dismissible toast', async () => {
    const toaster = await setup();

    toaster.message(
      { title: 'working', closeButton: true },
      { dismissible: false }
    );
    settle();

    const card = getCard();

    expect(getClose(card)).toBeNull();
    expect(card.style.touchAction).toBe('');
  });
});

describe('Toaster position', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir');
  });

  it('should default to the bottom-right corner', async () => {
    await setup();

    const region = getRegion();
    expect(region.dataset['y']).toBe('bottom');
    expect(region.dataset['x']).toBe('right');
  });

  it('should default to the bottom-left corner under RTL', async () => {
    document.documentElement.dir = 'rtl';
    await setup();

    // The direction lands after the first render, not in the
    // constructor: SSR and hydration agree on 'ltr', the subscription
    // settles the truth right after.
    settle();

    const region = getRegion();
    expect(region.dataset['y']).toBe('bottom');
    expect(region.dataset['x']).toBe('left');
  });

  it('should follow a live dir flip on the root', async () => {
    await setup();
    settle();
    expect(getRegion().dataset['x']).toBe('right');

    // The flip arrives through the MutationObserver subscription, not
    // through a re-render: nothing else about the tree changed.
    document.documentElement.dir = 'rtl';
    await Promise.resolve();
    settle();

    expect(getRegion().dataset['x']).toBe('left');
  });

  it('should treat an explicit position as physical and final', async () => {
    document.documentElement.dir = 'rtl';
    await setup({ position: 'top-right' });
    settle();

    const region = getRegion();
    expect(region.dataset['y']).toBe('top');
    expect(region.dataset['x']).toBe('right');
  });

  it('should derive the swipe default from the position', async () => {
    const toaster = await setup({ position: 'top-left' });

    toaster.message({ title: 'hi' });
    settle();

    // ['left', 'up'] spans both axes: the touch-action claim shows it.
    expect(getCard().style.touchAction).toBe('none');
  });

  it('should let an explicit swipeDirections outrank the position', async () => {
    const toaster = await setup({
      position: 'top-left',
      swipeDirections: ['left'],
    });

    toaster.message({ title: 'hi' });
    settle();

    expect(getCard().style.touchAction).toBe('pan-y');
  });
});
