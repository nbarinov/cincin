import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createToaster } from 'cincin';
import { Toaster } from './toaster';
import type { ToastContent } from './content';

/** jsdom lacks ResizeObserver; the layout tolerates silent stubs (height
 * variables stay unwritten, skins keep their fallbacks). */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function setup() {
  const toaster = createToaster<ToastContent>();
  render(<Toaster toaster={toaster} />);
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
});

describe('Toaster action', () => {
  function setupWithAction(
    onClick: NonNullable<ToastContent['action']>['onClick']
  ): HTMLElement {
    const toaster = setup();

    act(() => {
      toaster.message({
        title: 'archived',
        action: { label: 'Undo', onClick },
      });
    });

    return getCards()[0]!;
  }

  function clickAction(card: HTMLElement): void {
    const button = card.querySelector<HTMLElement>('[data-cincin-action]')!;
    act(() => void fireEvent.click(button));
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
    expect(card.style.touchAction).toBe('pan-y');
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
