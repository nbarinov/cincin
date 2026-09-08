import * as React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createToaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import type { Presenter } from 'cincin/presenter';
import { useViewport } from './use-viewport';

const DELAY = 200;

function ViewportHost({
  presenter,
  collapseDelay,
}: {
  presenter: Presenter;
  collapseDelay?: number;
}) {
  const { expanded, handlers } = useViewport(presenter, { collapseDelay });

  return (
    <ol data-testid="viewport" data-expanded={expanded} {...handlers}>
      <li>
        <button type="button" data-testid="inside" aria-label="Dismiss" />
      </li>
    </ol>
  );
}

function setup(collapseDelay?: number) {
  const toaster = createToaster();
  const presenter = createPresenter(toaster);
  presenter.mount();
  toaster.message('one');

  const view = render(
    <ViewportHost presenter={presenter} collapseDelay={collapseDelay} />
  );
  const viewport = view.getByTestId('viewport');

  return { toaster, presenter, viewport, view };
}

function isExpanded(viewport: HTMLElement): boolean {
  return viewport.dataset.expanded === 'true';
}

function paused(presenter: Presenter): boolean[] {
  return presenter.getSnapshot().map((toast) => toast.paused);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// Lifecycle facts only: the attention rules live in the machine's
// own suite in `cincin/dom` and are not restated here.
describe('useViewport', () => {
  it('should start folded and open on mouse enter', () => {
    const { viewport } = setup();
    expect(isExpanded(viewport)).toBe(false);

    fireEvent.mouseEnter(viewport);
    expect(isExpanded(viewport)).toBe(true);
  });

  it('should read the collapse delay from the options', () => {
    const { viewport } = setup(50);
    fireEvent.mouseEnter(viewport);
    fireEvent.mouseLeave(viewport);

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(isExpanded(viewport)).toBe(false);
  });

  it('should hold the presenter while open and release it on close', () => {
    const { presenter, viewport } = setup();
    expect(paused(presenter)).toEqual([false]);

    fireEvent.mouseEnter(viewport);
    expect(paused(presenter)).toEqual([true]);

    fireEvent.mouseLeave(viewport);
    act(() => {
      vi.advanceTimersByTime(DELAY);
    });
    expect(paused(presenter)).toEqual([false]);
  });

  it('should pause a toast entering an open stack as it enters', () => {
    const { toaster, presenter, viewport } = setup();
    fireEvent.mouseEnter(viewport);

    act(() => {
      toaster.message('two');
    });

    expect(paused(presenter)).toEqual([true, true]);
  });

  it('should release the presenter on unmount', () => {
    const { presenter, viewport, view } = setup();
    fireEvent.mouseEnter(viewport);
    expect(paused(presenter)).toEqual([true]);

    view.unmount();
    expect(paused(presenter)).toEqual([false]);
  });

  it('should open on focus within', () => {
    // Focus does not bubble: the adapter maps the bubbling pair.
    const { viewport, view } = setup();
    fireEvent.focus(view.getByTestId('inside'));
    expect(isExpanded(viewport)).toBe(true);
  });

  it('should fold on a pointerdown outside the stack', () => {
    const { viewport } = setup();
    fireEvent.mouseEnter(viewport);

    fireEvent.pointerDown(document.body);
    act(() => {
      vi.advanceTimersByTime(DELAY);
    });
    expect(isExpanded(viewport)).toBe(false);
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

    act(() => {
      toaster.remove();
    });
    act(() => {
      // The ghost finishes its exit through the safety net.
      vi.advanceTimersByTime(presenterExitMs());
    });
    act(() => {
      vi.advanceTimersByTime(DELAY);
    });

    expect(isExpanded(viewport)).toBe(false);
  });
});

/** The default presenter exit clock plus its grace. */
function presenterExitMs(): number {
  return 2000 + 50;
}
