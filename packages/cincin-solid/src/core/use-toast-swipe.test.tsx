import { cleanup, render } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { createToaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import type { Presenter, ToastKey } from 'cincin/presenter';
import type { SwipeDirection } from 'cincin/dom';
import { useToastSwipe } from './use-toast-swipe';
import type { ToastSwipeOptions } from './use-toast-swipe';

function mountSwipeHost(
  presenter: Presenter,
  key: ToastKey,
  options?: Omit<ToastSwipeOptions, 'key' | 'presenter'>
) {
  const Host = () => {
    const swipe = useToastSwipe({ key, presenter, ...options });

    return (
      <li data-testid="toast" style={swipe.style()} {...swipe.handlers()} />
    );
  };

  return render(() => <Host />);
}

/** A mounted presenter over a fresh toaster with one shown toast. */
function setup(): { presenter: Presenter; key: ToastKey } {
  const toaster = createToaster();
  const presenter = createPresenter(toaster);
  presenter.mount();
  toaster.message('swipe me');
  return { presenter, key: presenter.getSnapshot()[0]!.key };
}

function getToastElement(): HTMLElement {
  const element = document.querySelector('[data-testid="toast"]');
  if (!(element instanceof HTMLElement)) {
    throw new Error('toast element not rendered');
  }
  return element;
}

/** jsdom lacks the pointer capture and animation surface. */
function stubGestureSurface(element: HTMLElement): void {
  element.setPointerCapture = () => {};
  element.releasePointerCapture = () => {};
  element.animate = () =>
    ({ finished: Promise.resolve(), cancel() {} }) as unknown as Animation;
}

function firePointer(
  element: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  x: number
): void {
  element.dispatchEvent(
    new PointerEvent(type, {
      pointerId: 1,
      isPrimary: true,
      bubbles: true,
      clientX: x,
      clientY: 0,
    })
  );
}

/** A drag far past the 45px distance gate: the release dismisses. */
function swipeOut(element: HTMLElement): void {
  firePointer(element, 'pointerdown', 0);
  firePointer(element, 'pointermove', 30);
  firePointer(element, 'pointermove', 60);
  firePointer(element, 'pointerup', 60);
}

beforeEach(() => {
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
});

describe('useToastSwipe', () => {
  it('should attach the controller on mount and detach it on unmount', () => {
    const { presenter, key } = setup();

    const view = mountSwipeHost(presenter, key);
    expect(getToastElement().style.touchAction).toBe('none');

    view.unmount();
    presenter.unmount();
  });

  it('should reattach the controller when the directions source changes', () => {
    const { presenter, key } = setup();
    const [directions, setDirections] = createSignal<SwipeDirection[]>([
      'right',
    ]);

    mountSwipeHost(presenter, key, { directions });
    expect(getToastElement().style.touchAction).toBe('pan-y');

    // A fresh array with the same contents must not churn the
    // controller; changed contents must.
    setDirections(['down']);
    expect(getToastElement().style.touchAction).toBe('pan-x');

    presenter.unmount();
  });

  it('should wire dismiss and finish to the presenter on a passing gesture', async () => {
    const { presenter, key } = setup();

    mountSwipeHost(presenter, key);
    const element = getToastElement();
    stubGestureSurface(element);

    swipeOut(element);

    expect(element.getAttribute('data-swipe-direction')).toBe('right');
    expect(presenter.getSnapshot()[0]?.phase).toBe('leaving');

    // The stubbed fling resolves immediately: finish follows, and the
    // presenter removes the record it owned.
    await Promise.resolve();
    await Promise.resolve();
    expect(presenter.getSnapshot()).toHaveLength(0);

    presenter.unmount();
  });

  it('should not attach the controller while disabled', () => {
    const { presenter, key } = setup();

    mountSwipeHost(presenter, key, { enabled: false });
    const element = getToastElement();
    stubGestureSurface(element);

    // No controller at all: no touch-action claim, and a passing gesture
    // changes nothing.
    expect(element.style.touchAction).toBe('');

    swipeOut(element);

    expect(element.hasAttribute('data-swiping')).toBe(false);
    expect(presenter.getSnapshot()[0]?.phase).toBe('active');
    presenter.unmount();
  });

  it('should attach once enabled flips to true', () => {
    const { presenter, key } = setup();
    const [enabled, setEnabled] = createSignal(false);

    mountSwipeHost(presenter, key, { enabled });
    const element = getToastElement();
    stubGestureSurface(element);
    expect(element.style.touchAction).toBe('');

    setEnabled(true);
    expect(element.style.touchAction).toBe('none');

    swipeOut(element);

    expect(presenter.getSnapshot()[0]?.phase).toBe('leaving');
    presenter.unmount();
  });

  it('should detach and release its claims once disabled', () => {
    const { presenter, key } = setup();
    const [enabled, setEnabled] = createSignal(true);

    mountSwipeHost(presenter, key, { enabled });
    const element = getToastElement();
    expect(element.style.touchAction).toBe('none');

    setEnabled(false);

    expect(element.style.touchAction).toBe('');
    presenter.unmount();
  });
});
