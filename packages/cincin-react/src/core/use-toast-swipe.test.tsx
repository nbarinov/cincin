import { StrictMode } from 'react';
import { cleanup, render, renderHook } from '@testing-library/react';
import { createToaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import { useToastSwipe } from './use-toast-swipe';
import type { Presenter, ToastKey } from 'cincin/presenter';
import type { ToastSwipeOptions } from './use-toast-swipe';

function SwipeHost({
  toastKey,
  presenter,
  options,
}: {
  toastKey: ToastKey;
  presenter: Presenter;
  options?: Omit<ToastSwipeOptions, 'key' | 'presenter'>;
}) {
  const swipe = useToastSwipe({ key: toastKey, presenter, ...options });
  return <li data-testid="toast" style={swipe.style} {...swipe.handlers} />;
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

    const view = render(<SwipeHost toastKey={key} presenter={presenter} />);
    expect(getToastElement().style.touchAction).toBe('none');

    view.unmount();
    presenter.unmount();
  });

  it('should survive a StrictMode double mount', () => {
    const { presenter, key } = setup();

    render(
      <StrictMode>
        <SwipeHost toastKey={key} presenter={presenter} />
      </StrictMode>
    );

    expect(getToastElement().style.touchAction).toBe('none');
    presenter.unmount();
  });

  it('should recreate the controller when the directions change', () => {
    const { presenter, key } = setup();

    const view = render(
      <SwipeHost toastKey={key} presenter={presenter} options={{}} />
    );
    expect(getToastElement().style.touchAction).toBe('none');

    // The set is read-once: a new set is a new controller, and the
    // declarative touch-action claim flips with it. The inline literal
    // recreates by contents, not by array identity.
    view.rerender(
      <SwipeHost
        toastKey={key}
        presenter={presenter}
        options={{ directions: ['down'] }}
      />
    );
    expect(getToastElement().style.touchAction).toBe('pan-x');

    presenter.unmount();
  });

  it('should keep the handlers identity across tuning changes', () => {
    const { presenter, key } = setup();

    const { result, rerender } = renderHook(
      ({ damping }: { damping: number }) =>
        useToastSwipe({ key, presenter, drag: { damping } }),
      { initialProps: { damping: 0.7 } }
    );
    const before = result.current.handlers;

    // Tuning rides setOptions on the live controller: no recreation,
    // and a composed consumer sees the same handler identities.
    rerender({ damping: 0.5 });

    expect(result.current.handlers).toBe(before);
    presenter.unmount();
  });

  it('should wire dismiss and finish to the presenter on a passing gesture', async () => {
    const { presenter, key } = setup();

    render(<SwipeHost toastKey={key} presenter={presenter} />);
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

    render(
      <SwipeHost
        toastKey={key}
        presenter={presenter}
        options={{ enabled: false }}
      />
    );
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

    const view = render(
      <SwipeHost
        toastKey={key}
        presenter={presenter}
        options={{ enabled: false }}
      />
    );
    const element = getToastElement();
    stubGestureSurface(element);
    expect(element.style.touchAction).toBe('');

    view.rerender(
      <SwipeHost
        toastKey={key}
        presenter={presenter}
        options={{ enabled: true }}
      />
    );
    expect(element.style.touchAction).toBe('none');

    swipeOut(element);

    expect(presenter.getSnapshot()[0]?.phase).toBe('leaving');
    presenter.unmount();
  });

  it('should detach and release its claims once disabled', () => {
    const { presenter, key } = setup();

    const view = render(<SwipeHost toastKey={key} presenter={presenter} />);
    const element = getToastElement();
    expect(element.style.touchAction).toBe('none');

    view.rerender(
      <SwipeHost
        toastKey={key}
        presenter={presenter}
        options={{ enabled: false }}
      />
    );

    expect(element.style.touchAction).toBe('');
    presenter.unmount();
  });
});
