import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createToaster } from 'cincin';
import { Toaster } from './toaster';
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
  render(<Toaster toaster={toaster} {...(labels && { labels })} />);
  return toaster;
}

function getCards(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-cincin-toast]')];
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
  it('should name the region landmark and keep the list role under it', () => {
    const toaster = setup();

    act(() => {
      toaster.message({ title: 'hi' });
    });

    const landmark = document.querySelector(
      'section[aria-label="Notifications"]'
    );
    expect(landmark).not.toBeNull();
    // The landmark wraps the list instead of replacing its role: the
    // screen reader keeps both the region and "list, N items".
    expect(landmark!.contains(getRegion())).toBe(true);
    expect(getRegion().hasAttribute('role')).toBe(false);
  });

  it('should speak the labels prop on the landmark and the close button', () => {
    const toaster = setup({ region: 'Alerts', close: 'Close' });

    act(() => {
      toaster.message({ title: 'hi' });
    });

    expect(document.querySelector('section[aria-label="Alerts"]')).not.toBe(
      null
    );
    const close = getRegion().querySelector('[data-cincin-close]');
    expect(close!.getAttribute('aria-label')).toBe('Close');
  });

  it('should keep collapsed back cards inert and the front card live', () => {
    const toaster = setup();

    act(() => {
      toaster.message({ title: 'old' });
      toaster.message({ title: 'new' });
    });

    // DOM keeps the snapshot order: the oldest card first, the front last.
    const [back, front] = getCards();
    expect(back!.hasAttribute('inert')).toBe(true);
    expect(front!.hasAttribute('inert')).toBe(false);
  });

  it('should expand on focus and let the back cards join the tab order', () => {
    const toaster = setup();

    act(() => {
      toaster.message({ title: 'old' });
      toaster.message({ title: 'new' });
    });

    const [back, front] = getCards();
    const close = front!.querySelector<HTMLElement>('[data-cincin-close]')!;
    act(() => close.focus());

    expect(getRegion().dataset.expanded).toBe('true');
    expect(back!.hasAttribute('inert')).toBe(false);
  });

  it('should collapse after focus leaves and re-inert the backs', () => {
    const toaster = setup();

    act(() => {
      toaster.message({ title: 'old' });
      toaster.message({ title: 'new' });
    });

    const [back, front] = getCards();
    const close = front!.querySelector<HTMLElement>('[data-cincin-close]')!;
    act(() => close.focus());
    act(() => close.blur());

    // The collapse waits out its delay before folding the stack back.
    expect(getRegion().dataset.expanded).toBe('true');
    act(() => vi.advanceTimersByTime(200));

    expect(getRegion().dataset.expanded).toBe('false');
    expect(back!.hasAttribute('inert')).toBe(true);
  });

  it('should keep a leaving ghost inert even while expanded', () => {
    const toaster = setup();
    let id!: ReturnType<typeof toaster.message>;

    act(() => {
      toaster.message({ title: 'old' });
      id = toaster.message({ title: 'new' });
    });

    const [, front] = getCards();
    const close = front!.querySelector<HTMLElement>('[data-cincin-close]')!;
    act(() => close.focus());
    act(() => toaster.remove(id));

    expect(getRegion().dataset.expanded).toBe('true');
    expect(front!.dataset.phase).toBe('leaving');
    expect(front!.hasAttribute('inert')).toBe(true);
  });

  it('should tab the cross before the action, as the card reads', () => {
    const toaster = setup();

    act(() => {
      toaster.error({
        title: 'Something broke',
        description: 'The request did not survive the round trip.',
        actions: [{ label: 'Retry', onClick: () => {} }],
      });
    });

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

  function clickAction(card: HTMLElement, index = 0): void {
    act(() => void fireEvent.click(getActions(card)[index]!));
  }

  function setupWithAction(onClick: ToastAction['onClick']): HTMLElement {
    const toaster = setup();

    act(() => {
      toaster.message({
        title: 'archived',
        actions: [{ label: 'Undo', onClick }],
      });
    });

    return getCards()[0]!;
  }

  function setupWithPair(onSecond: ToastAction['onClick']): HTMLElement {
    const toaster = setup();

    act(() => {
      toaster.message({
        title: 'Invitation',
        description: 'Anna asked to join the workspace.',
        actions: [
          { label: 'Decline', variant: 'secondary', onClick: () => {} },
          { label: 'Accept', onClick: onSecond },
        ],
      });
    });

    return getCards()[0]!;
  }

  it('should dismiss the toast after the action click', () => {
    const card = setupWithAction(() => {});
    clickAction(card);

    expect(card.dataset.phase).toBe('leaving');
  });

  it('should keep the toast when the handler prevents the click', () => {
    const card = setupWithAction((event) => event.preventDefault());
    clickAction(card);

    expect(card.dataset.phase).toBe('active');
  });

  it('should render a pair in the tuple order and default to primary', () => {
    const card = setupWithPair(() => {});

    // The skin never reorders: the caller owns the layout, and the
    // variant, not the position, says which one is loud.
    expect(
      getActions(card).map((button) => [
        button.textContent,
        button.dataset.variant,
      ])
    ).toEqual([
      ['Decline', 'secondary'],
      ['Accept', 'primary'],
    ]);
  });

  it('should let the second button dismiss on the same rule', () => {
    const onAccept = vi.fn();
    const card = setupWithPair(onAccept);
    clickAction(card, 1);

    expect(onAccept).toHaveBeenCalledOnce();
    expect(card.dataset.phase).toBe('leaving');
  });

  it('should keep the toast when the second handler prevents the click', () => {
    const card = setupWithPair((event) => event.preventDefault());
    clickAction(card, 1);

    expect(card.dataset.phase).toBe('active');
  });
});

describe('Toaster close button', () => {
  function getClose(card: HTMLElement): HTMLElement | null {
    return card.querySelector<HTMLElement>('[data-cincin-close]');
  }

  it('should keep the cross by default', () => {
    const toaster = setup();

    act(() => {
      toaster.message({ title: 'archived' });
    });

    expect(getClose(getCards()[0]!)).not.toBeNull();
  });

  it('should drop the cross while the toast stays dismissible', () => {
    const toaster = setup();

    act(() => {
      toaster.message({ title: 'archived', closeButton: false });
    });

    const card = getCards()[0]!;

    // Chrome only: the permission is untouched, so the swipe controller
    // is still attached and still claims its cross axis.
    expect(getClose(card)).toBeNull();
    expect(card.dataset.dismissible).toBe('true');
    expect(card.style.touchAction).toBe('none');
  });

  it('should not bring the cross back on a non-dismissible toast', () => {
    const toaster = setup();

    act(() => {
      toaster.message(
        { title: 'working', closeButton: true },
        { dismissible: false }
      );
    });

    const card = getCards()[0]!;

    expect(getClose(card)).toBeNull();
    expect(card.style.touchAction).toBe('');
  });
});

describe('Toaster position', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir');
  });

  it('should default to the bottom-right corner', () => {
    setup();

    const region = getRegion();
    expect(region.dataset.y).toBe('bottom');
    expect(region.dataset.x).toBe('right');
  });

  it('should default to the bottom-left corner under RTL', () => {
    document.documentElement.dir = 'rtl';
    setup();

    const region = getRegion();
    expect(region.dataset.y).toBe('bottom');
    expect(region.dataset.x).toBe('left');
  });

  it('should follow a live dir flip on the root', async () => {
    setup();
    expect(getRegion().dataset.x).toBe('right');

    // The flip arrives through the MutationObserver subscription, not
    // through a re-render: nothing else about the tree changed.
    await act(async () => {
      document.documentElement.dir = 'rtl';
      await Promise.resolve();
    });

    expect(getRegion().dataset.x).toBe('left');
  });

  it('should treat an explicit position as physical and final', () => {
    document.documentElement.dir = 'rtl';
    const toaster = createToaster<ToastContent>();
    render(<Toaster toaster={toaster} position="top-right" />);

    const region = getRegion();
    expect(region.dataset.y).toBe('top');
    expect(region.dataset.x).toBe('right');
  });

  it('should derive the swipe default from the position', () => {
    const toaster = createToaster<ToastContent>();
    render(<Toaster toaster={toaster} position="top-left" />);

    act(() => {
      toaster.message({ title: 'hi' });
    });

    // ['left', 'up'] spans both axes: the touch-action claim shows it.
    expect(getCards()[0]!.style.touchAction).toBe('none');
  });

  it('should let an explicit swipeDirections outrank the position', () => {
    const toaster = createToaster<ToastContent>();
    render(
      <Toaster
        toaster={toaster}
        position="top-left"
        swipeDirections={['left']}
      />
    );

    act(() => {
      toaster.message({ title: 'hi' });
    });

    expect(getCards()[0]!.style.touchAction).toBe('pan-y');
  });
});
