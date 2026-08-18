import { StrictMode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { createToaster } from 'cincin';
import { useToastSwipe } from './use-toast-swipe';
import type { Toaster, ToastId } from 'cincin';
import type { ToastSwipeOptions } from './use-toast-swipe';

function SwipeHost({
  toastId,
  toaster,
  options,
}: {
  toastId: ToastId;
  toaster: Toaster;
  options?: ToastSwipeOptions;
}) {
  const ref = useToastSwipe(toastId, toaster, options);
  return <li data-testid="toast" ref={ref} />;
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
    const toaster = createToaster();
    const id = toaster.message('swipe me');

    const view = render(<SwipeHost toastId={id} toaster={toaster} />);
    expect(getToastElement().style.touchAction).toBe('pan-y');

    view.unmount();
    toaster.destroy();
  });

  it('should survive a StrictMode double mount', () => {
    const toaster = createToaster();
    const id = toaster.message('strict');

    render(
      <StrictMode>
        <SwipeHost toastId={id} toaster={toaster} />
      </StrictMode>
    );

    expect(getToastElement().style.touchAction).toBe('pan-y');
    toaster.destroy();
  });

  it('should reattach the controller when the direction changes', () => {
    const toaster = createToaster();
    const id = toaster.message('turn');

    const view = render(
      <SwipeHost toastId={id} toaster={toaster} options={{}} />
    );
    expect(getToastElement().style.touchAction).toBe('pan-y');

    // The fresh options must reach the new channel in the same commit:
    // a lagging latest-ref would reattach with the previous direction.
    view.rerender(
      <SwipeHost
        toastId={id}
        toaster={toaster}
        options={{ direction: 'down' }}
      />
    );
    expect(getToastElement().style.touchAction).toBe('pan-x');

    toaster.destroy();
  });

  it('should not reattach when only the tuning identity changes', () => {
    const toaster = createToaster();
    const id = toaster.message('tune');

    const view = render(
      <SwipeHost toastId={id} toaster={toaster} options={{}} />
    );
    const element = getToastElement();
    const listen = vi.spyOn(element, 'addEventListener');

    view.rerender(
      <SwipeHost
        toastId={id}
        toaster={toaster}
        options={{ drag: { damping: 0.5 } }}
      />
    );

    expect(listen).not.toHaveBeenCalled();
    toaster.destroy();
  });

  it('should wire dismiss and remove to the toaster on a passing gesture', async () => {
    const toaster = createToaster();
    const id = toaster.message('goodbye');

    render(<SwipeHost toastId={id} toaster={toaster} />);
    const element = getToastElement();
    stubGestureSurface(element);

    // Far past the 45px distance gate: the release dismisses.
    firePointer(element, 'pointerdown', 0);
    firePointer(element, 'pointermove', 30);
    firePointer(element, 'pointermove', 60);
    firePointer(element, 'pointerup', 60);

    expect(element.getAttribute('data-swipe-direction')).toBe('right');
    expect(toaster.getSnapshot()[0]?.status).toBe('dismissing');

    // The stubbed fling resolves immediately: remove follows.
    await Promise.resolve();
    await Promise.resolve();
    expect(toaster.getSnapshot()).toHaveLength(0);

    toaster.destroy();
  });

  it('should not attach the controller while disabled', () => {
    const toaster = createToaster();
    const id = toaster.message('locked');

    render(
      <SwipeHost toastId={id} toaster={toaster} options={{ enabled: false }} />
    );
    const element = getToastElement();
    stubGestureSurface(element);

    // No controller at all: no touch-action claim, and a passing gesture
    // changes nothing.
    expect(element.style.touchAction).toBe('');

    firePointer(element, 'pointerdown', 0);
    firePointer(element, 'pointermove', 30);
    firePointer(element, 'pointermove', 60);
    firePointer(element, 'pointerup', 60);

    expect(element.hasAttribute('data-swiping')).toBe(false);
    expect(toaster.getSnapshot()[0]?.status).toBe('active');
    toaster.destroy();
  });

  it('should attach once enabled flips to true', () => {
    const toaster = createToaster();
    const id = toaster.message('unlocked later');

    const view = render(
      <SwipeHost toastId={id} toaster={toaster} options={{ enabled: false }} />
    );
    const element = getToastElement();
    stubGestureSurface(element);
    expect(element.style.touchAction).toBe('');

    view.rerender(
      <SwipeHost toastId={id} toaster={toaster} options={{ enabled: true }} />
    );
    expect(element.style.touchAction).toBe('pan-y');

    firePointer(element, 'pointerdown', 0);
    firePointer(element, 'pointermove', 30);
    firePointer(element, 'pointermove', 60);
    firePointer(element, 'pointerup', 60);

    expect(toaster.getSnapshot()[0]?.status).toBe('dismissing');
    toaster.destroy();
  });

  it('should detach and release its claims once disabled', () => {
    const toaster = createToaster();
    const id = toaster.message('locked later');

    const view = render(<SwipeHost toastId={id} toaster={toaster} />);
    const element = getToastElement();
    expect(element.style.touchAction).toBe('pan-y');

    view.rerender(
      <SwipeHost toastId={id} toaster={toaster} options={{ enabled: false }} />
    );

    expect(element.style.touchAction).toBe('');
    toaster.destroy();
  });
});
