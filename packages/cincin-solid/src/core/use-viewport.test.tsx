import { cleanup, fireEvent, render } from '@solidjs/testing-library';
import { createToaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import type { Presenter } from 'cincin/presenter';
import { useViewport } from './use-viewport';

const DELAY = 200;

function setup(collapseDelay?: number) {
  const toaster = createToaster();
  const presenter = createPresenter(toaster);
  presenter.mount();
  toaster.message('one');

  const Host = () => {
    const viewport = useViewport(presenter, { collapseDelay });

    return (
      <ol
        data-testid="viewport"
        data-expanded={String(viewport.expanded())}
        {...viewport.handlers}
      >
        <li>
          <button type="button" data-testid="inside" aria-label="Dismiss" />
        </li>
      </ol>
    );
  };

  const view = render(() => <Host />);
  const viewport = view.getByTestId('viewport');
  const inside = view.getByTestId('inside');

  return { toaster, presenter, viewport, inside, view };
}

function isExpanded(viewport: HTMLElement): boolean {
  return viewport.dataset.expanded === 'true';
}

function paused(presenter: Presenter): boolean[] {
  return presenter.getSnapshot().map((toast) => toast.paused);
}

/** The default presenter exit clock plus its grace. */
function presenterExitMs(): number {
  return 2000 + 50;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useViewport', () => {
  it('should start folded and open on mouse enter', () => {
    const { viewport } = setup();
    expect(isExpanded(viewport)).toBe(false);

    fireEvent.mouseEnter(viewport);
    expect(isExpanded(viewport)).toBe(true);
  });

  it('should fold a delay after the mouse leaves', () => {
    const { viewport } = setup();
    fireEvent.mouseEnter(viewport);
    fireEvent.mouseLeave(viewport);

    expect(isExpanded(viewport)).toBe(true);
    vi.advanceTimersByTime(DELAY);
    expect(isExpanded(viewport)).toBe(false);
  });

  it('should read the collapse delay from the options', () => {
    const { viewport } = setup(50);
    fireEvent.mouseEnter(viewport);
    fireEvent.mouseLeave(viewport);

    vi.advanceTimersByTime(50);
    expect(isExpanded(viewport)).toBe(false);
  });

  it('should hold the presenter while open and release it on close', () => {
    const { presenter, viewport } = setup();
    expect(paused(presenter)).toEqual([false]);

    fireEvent.mouseEnter(viewport);
    expect(paused(presenter)).toEqual([true]);

    fireEvent.mouseLeave(viewport);
    vi.advanceTimersByTime(DELAY);
    expect(paused(presenter)).toEqual([false]);
  });

  it('should pause a toast entering an open stack as it enters', () => {
    const { toaster, presenter, viewport } = setup();
    fireEvent.mouseEnter(viewport);

    toaster.message('two');

    expect(paused(presenter)).toEqual([true, true]);
  });

  it('should release the presenter on unmount', () => {
    const { presenter, viewport, view } = setup();
    fireEvent.mouseEnter(viewport);
    expect(paused(presenter)).toEqual([true]);

    view.unmount();
    expect(paused(presenter)).toEqual([false]);
  });

  it('should open on focus within and keep open through a mouse leave', () => {
    const { viewport, inside } = setup();
    inside.focus();
    expect(isExpanded(viewport)).toBe(true);

    fireEvent.mouseEnter(viewport);
    fireEvent.mouseLeave(viewport);
    vi.advanceTimersByTime(DELAY);
    expect(isExpanded(viewport)).toBe(true);
  });

  it('should fold after focus leaves the stack', () => {
    const { viewport, inside } = setup();
    inside.focus();
    inside.blur();

    vi.advanceTimersByTime(DELAY);
    expect(isExpanded(viewport)).toBe(false);
  });

  it('should fold on a pointerdown outside the stack', () => {
    const { viewport } = setup();
    fireEvent.mouseEnter(viewport);

    fireEvent.pointerDown(document.body);
    vi.advanceTimersByTime(DELAY);
    expect(isExpanded(viewport)).toBe(false);
  });

  it('should stay open on a pointerdown inside the stack', () => {
    const { viewport, inside } = setup();
    fireEvent.mouseEnter(viewport);

    fireEvent.pointerDown(inside);
    fireEvent.pointerUp(inside);
    vi.advanceTimersByTime(DELAY);
    expect(isExpanded(viewport)).toBe(true);
  });

  it('should stop listening to the document on unmount', () => {
    const { viewport, view } = setup();
    fireEvent.mouseEnter(viewport);
    view.unmount();

    // A folded stack that nobody drives stays quiet: no throw, no
    // stray hover end reaching a destroyed controller.
    expect(() => fireEvent.pointerDown(document.body)).not.toThrow();
  });

  it('should end the hover when the stack empties', () => {
    // The last card leaves from under a parked pointer: no mouseleave
    // arrives, so the next toast must not be born into an open stack.
    const { toaster, viewport } = setup();
    fireEvent.mouseEnter(viewport);

    toaster.remove();
    // The ghost finishes its exit through the safety net.
    vi.advanceTimersByTime(presenterExitMs());
    vi.advanceTimersByTime(DELAY);

    expect(isExpanded(viewport)).toBe(false);
  });
});
