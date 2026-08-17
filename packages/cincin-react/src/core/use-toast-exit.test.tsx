import { cleanup, fireEvent, render } from '@testing-library/react';
import { createToaster } from 'cincin';
import { useToastExit } from './use-toast-exit';
import type { Toaster, ToastId } from 'cincin';

function ExitHost({ toastId, toaster }: { toastId: ToastId; toaster: Toaster }) {
  const onExitEnd = useToastExit(toastId, toaster);
  return (
    <li data-testid="toast" onTransitionEnd={onExitEnd}>
      <button data-testid="child" type="button" />
    </li>
  );
}

let reduceMotion = false;

function getToast(): HTMLElement {
  return document.querySelector('[data-testid="toast"]') as HTMLElement;
}

beforeEach(() => {
  reduceMotion = false;
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes('prefers-reduced-motion') && reduceMotion,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
});

describe('useToastExit', () => {
  it('should remove a dismissing toast when its exit ends', () => {
    const toaster = createToaster();
    const id = toaster.message('leaving');
    render(<ExitHost toastId={id} toaster={toaster} />);

    toaster.dismiss(id);
    fireEvent.transitionEnd(getToast());

    expect(toaster.getSnapshot()).toHaveLength(0);
    toaster.destroy();
  });

  it('should ignore end events bubbling from children', () => {
    const toaster = createToaster();
    const id = toaster.message('stay');
    render(<ExitHost toastId={id} toaster={toaster} />);

    toaster.dismiss(id);
    fireEvent.transitionEnd(
      document.querySelector('[data-testid="child"]') as HTMLElement
    );

    expect(toaster.getSnapshot()[0]?.status).toBe('dismissing');
    toaster.destroy();
  });

  it('should not remove a live toast', () => {
    const toaster = createToaster();
    const id = toaster.message('alive');
    render(<ExitHost toastId={id} toaster={toaster} />);

    fireEvent.transitionEnd(getToast());

    expect(toaster.getSnapshot()[0]?.status).toBe('active');
    toaster.destroy();
  });

  it('should leave a swiped exit to the controller', () => {
    const toaster = createToaster();
    const id = toaster.message('flung');
    render(<ExitHost toastId={id} toaster={toaster} />);

    getToast().setAttribute('data-swipe-direction', 'right');
    toaster.dismiss(id);
    fireEvent.transitionEnd(getToast());

    expect(toaster.getSnapshot()[0]?.status).toBe('dismissing');
    toaster.destroy();
  });

  it('should remove synchronously under reduced motion', async () => {
    reduceMotion = true;
    const toaster = createToaster();
    const id = toaster.message('instant');
    render(<ExitHost toastId={id} toaster={toaster} />);

    toaster.dismiss(id);
    await Promise.resolve();

    expect(toaster.getSnapshot()).toHaveLength(0);
    toaster.destroy();
  });

  it('should drop the subscription on unmount', async () => {
    reduceMotion = true;
    const toaster = createToaster();
    const id = toaster.message('orphan');
    const view = render(<ExitHost toastId={id} toaster={toaster} />);

    view.unmount();
    toaster.dismiss(id);
    await Promise.resolve();

    // Nobody completes the dismissal anymore: the safety net will.
    expect(toaster.getSnapshot()[0]?.status).toBe('dismissing');
    toaster.destroy();
  });
});
