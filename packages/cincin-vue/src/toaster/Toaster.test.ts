import { cleanup, fireEvent, render } from '@testing-library/vue';
import { createToaster } from 'cincin';
import { nextTick } from 'vue';
import Toaster from './Toaster.vue';
import type { ToastAction, ToastContent, ToasterLabels } from './content';

/** jsdom lacks ResizeObserver; the layout tolerates silent stubs (height
 * variables stay unwritten, skins keep their fallbacks). */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function setup(labels?: ToasterLabels) {
  const toaster = createToaster<ToastContent>();
  render(Toaster, { props: { toaster, ...(labels && { labels }) } });
  return toaster;
}

function getCards(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-cincin-toast]')];
}

/** Two ticks, not one: the first render registers the cards, the
 * post-flush layout pass writes their slots, and only the second
 * render paints the slot-driven attributes. */
async function flushEffects(): Promise<void> {
  await nextTick();
  await nextTick();
}

function getRegion(): HTMLElement {
  const region = document.querySelector<HTMLElement>('[data-cincin-toaster]');
  if (region === null) {
    throw new Error('region not rendered');
  }
  return region;
}

beforeEach(() => {
  vi.useFakeTimers();
  window.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Toaster a11y', () => {
  it('should name the region landmark and keep the list role under it', async () => {
    const toaster = setup();

    toaster.message({ title: 'hi' });
    await flushEffects();

    const landmark = document.querySelector(
      'section[aria-label="Notifications"]'
    );
    expect(landmark).not.toBeNull();
    // The landmark wraps the list instead of replacing its role: the
    // screen reader keeps both the region and "list, N items".
    expect(landmark!.contains(getRegion())).toBe(true);
    expect(getRegion().hasAttribute('role')).toBe(false);
  });

  it('should speak the labels prop on the landmark and the close button', async () => {
    const toaster = setup({ region: 'Alerts', close: 'Close' });

    toaster.message({ title: 'hi' });
    await flushEffects();

    expect(document.querySelector('section[aria-label="Alerts"]')).not.toBe(
      null
    );
    const close = getRegion().querySelector('[data-cincin-close]');
    expect(close!.getAttribute('aria-label')).toBe('Close');
  });

  it('should keep collapsed back cards inert and the front card live', async () => {
    const toaster = setup();

    toaster.message({ title: 'old' });
    toaster.message({ title: 'new' });
    await flushEffects();

    // DOM keeps the snapshot order: the oldest card first, the front last.
    const [back, front] = getCards();
    expect(back!.hasAttribute('inert')).toBe(true);
    expect(front!.hasAttribute('inert')).toBe(false);
  });

  it('should expand on focus and let the back cards join the tab order', async () => {
    const toaster = setup();

    toaster.message({ title: 'old' });
    toaster.message({ title: 'new' });
    await flushEffects();

    const [back, front] = getCards();
    const close = front!.querySelector<HTMLElement>('[data-cincin-close]')!;
    close.focus();
    await nextTick();

    expect(getRegion().dataset.expanded).toBe('true');
    expect(back!.hasAttribute('inert')).toBe(false);
  });

  it('should collapse after focus leaves and re-inert the backs', async () => {
    const toaster = setup();

    toaster.message({ title: 'old' });
    toaster.message({ title: 'new' });
    await flushEffects();

    const [back, front] = getCards();
    const close = front!.querySelector<HTMLElement>('[data-cincin-close]')!;
    close.focus();
    await nextTick();
    close.blur();
    await nextTick();

    // The collapse waits out its delay before folding the stack back.
    expect(getRegion().dataset.expanded).toBe('true');
    vi.advanceTimersByTime(200);
    await nextTick();

    expect(getRegion().dataset.expanded).toBe('false');
    expect(back!.hasAttribute('inert')).toBe(true);
  });

  it('should keep a leaving ghost inert even while expanded', async () => {
    const toaster = setup();

    toaster.message({ title: 'old' });
    const id = toaster.message({ title: 'new' });
    await nextTick();

    const [, front] = getCards();
    const close = front!.querySelector<HTMLElement>('[data-cincin-close]')!;
    close.focus();
    await nextTick();
    toaster.remove(id);
    await nextTick();

    expect(getRegion().dataset.expanded).toBe('true');
    expect(front!.dataset.phase).toBe('leaving');
    expect(front!.hasAttribute('inert')).toBe(true);
  });

  it('should tab the cross before the action, as the card reads', async () => {
    const toaster = setup();

    toaster.error({
      title: 'Something broke',
      description: 'The request did not survive the round trip.',
      actions: [{ label: 'Retry', onClick: () => {} }],
    });
    await nextTick();

    // The grid puts the cross in the first row and the action in the
    // second: the markup has to agree, or the tab sequence walks the
    // card bottom to top.
    const order = [...getCards()[0]!.querySelectorAll('button')].map(
      (button) =>
        button.hasAttribute('data-cincin-close') ? 'close' : 'action'
    );

    expect(order).toEqual(['close', 'action']);
  });
});

describe('Toaster actions', () => {
  function getActions(card: HTMLElement): HTMLElement[] {
    return [...card.querySelectorAll<HTMLElement>('[data-cincin-action]')];
  }

  async function clickAction(card: HTMLElement, index = 0): Promise<void> {
    await fireEvent.click(getActions(card)[index]!);
  }

  async function setupWithAction(
    onClick: ToastAction['onClick']
  ): Promise<HTMLElement> {
    const toaster = setup();

    toaster.message({
      title: 'archived',
      actions: [{ label: 'Undo', onClick }],
    });
    await nextTick();

    return getCards()[0]!;
  }

  async function setupWithPair(
    onSecond: ToastAction['onClick']
  ): Promise<HTMLElement> {
    const toaster = setup();

    toaster.message({
      title: 'Invitation',
      description: 'Anna asked to join the workspace.',
      actions: [
        { label: 'Decline', variant: 'secondary', onClick: () => {} },
        { label: 'Accept', onClick: onSecond },
      ],
    });
    await nextTick();

    return getCards()[0]!;
  }

  it('should dismiss the toast after the action click', async () => {
    const card = await setupWithAction(() => {});
    await clickAction(card);

    expect(card.dataset.phase).toBe('leaving');
  });

  it('should keep the toast when the handler prevents the click', async () => {
    const card = await setupWithAction((event) => event.preventDefault());
    await clickAction(card);

    expect(card.dataset.phase).toBe('active');
  });

  it('should render a pair in the tuple order and default to primary', async () => {
    const card = await setupWithPair(() => {});

    // The skin never reorders: the caller owns the layout, and the
    // variant, not the position, says which one is loud.
    expect(
      getActions(card).map((button) => [
        button.textContent?.trim(),
        button.dataset.variant,
      ])
    ).toEqual([
      ['Decline', 'secondary'],
      ['Accept', 'primary'],
    ]);
  });

  it('should let the second button dismiss on the same rule', async () => {
    const onAccept = vi.fn();
    const card = await setupWithPair(onAccept);
    await clickAction(card, 1);

    expect(onAccept).toHaveBeenCalledOnce();
    expect(card.dataset.phase).toBe('leaving');
  });

  it('should keep the toast when the second handler prevents the click', async () => {
    const card = await setupWithPair((event) => event.preventDefault());
    await clickAction(card, 1);

    expect(card.dataset.phase).toBe('active');
  });
});

describe('Toaster close button', () => {
  function getClose(card: HTMLElement): HTMLElement | null {
    return card.querySelector<HTMLElement>('[data-cincin-close]');
  }

  it('should keep the cross by default', async () => {
    const toaster = setup();

    toaster.message({ title: 'archived' });
    await nextTick();

    expect(getClose(getCards()[0]!)).not.toBeNull();
  });

  it('should drop the cross while the toast stays dismissible', async () => {
    const toaster = setup();

    toaster.message({ title: 'archived', closeButton: false });
    await nextTick();

    const card = getCards()[0]!;

    // Chrome only: the permission is untouched, so the swipe controller
    // is still attached and still claims its cross axis.
    expect(getClose(card)).toBeNull();
    expect(card.dataset.dismissible).toBe('true');
    expect(card.style.touchAction).toBe('pan-y');
  });

  it('should not bring the cross back on a non-dismissible toast', async () => {
    const toaster = setup();

    toaster.message(
      { title: 'working', closeButton: true },
      { dismissible: false }
    );
    await nextTick();

    const card = getCards()[0]!;

    expect(getClose(card)).toBeNull();
    expect(card.style.touchAction).toBe('');
  });
});
