import { cleanup, render } from '@testing-library/vue';
import { createToaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import type { Presenter, ToastKey } from 'cincin/presenter';
import type { SwipeDirection } from 'cincin/dom';
import { defineComponent, h, nextTick, shallowRef } from 'vue';
import { useToastSwipe } from './use-toast-swipe';
import type { ToastSwipeOptions } from './use-toast-swipe';

function mountSwipeHost(
  presenter: Presenter,
  key: ToastKey,
  options?: Omit<ToastSwipeOptions, 'key' | 'presenter'>
) {
  const element = shallowRef<HTMLElement | null>(null);

  const Host = defineComponent({
    setup() {
      useToastSwipe(element, { key, presenter, ...options });
      return () => h('li', { 'data-testid': 'toast', ref: element });
    },
  });

  return render(Host);
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
  it('should attach the controller on mount and detach it on unmount', async () => {
    const { presenter, key } = setup();

    const view = mountSwipeHost(presenter, key);
    await nextTick();
    expect(getToastElement().style.touchAction).toBe('pan-y');

    view.unmount();
    presenter.unmount();
  });

  it('should reattach the controller when the direction source changes', async () => {
    const { presenter, key } = setup();
    const direction = shallowRef<SwipeDirection>('right');

    mountSwipeHost(presenter, key, { direction });
    await nextTick();
    expect(getToastElement().style.touchAction).toBe('pan-y');

    direction.value = 'down';
    await nextTick();
    expect(getToastElement().style.touchAction).toBe('pan-x');

    presenter.unmount();
  });

  it('should wire dismiss and finish to the presenter on a passing gesture', async () => {
    const { presenter, key } = setup();

    mountSwipeHost(presenter, key);
    await nextTick();
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

  it('should not attach the controller while disabled', async () => {
    const { presenter, key } = setup();

    mountSwipeHost(presenter, key, { enabled: false });
    await nextTick();
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

  it('should attach once enabled flips to true', async () => {
    const { presenter, key } = setup();
    const enabled = shallowRef(false);

    mountSwipeHost(presenter, key, { enabled });
    await nextTick();
    const element = getToastElement();
    stubGestureSurface(element);
    expect(element.style.touchAction).toBe('');

    enabled.value = true;
    await nextTick();
    expect(element.style.touchAction).toBe('pan-y');

    swipeOut(element);

    expect(presenter.getSnapshot()[0]?.phase).toBe('leaving');
    presenter.unmount();
  });

  it('should detach and release its claims once disabled', async () => {
    const { presenter, key } = setup();
    const enabled = shallowRef(true);

    mountSwipeHost(presenter, key, { enabled });
    await nextTick();
    const element = getToastElement();
    expect(element.style.touchAction).toBe('pan-y');

    enabled.value = false;
    await nextTick();

    expect(element.style.touchAction).toBe('');
    presenter.unmount();
  });
});
