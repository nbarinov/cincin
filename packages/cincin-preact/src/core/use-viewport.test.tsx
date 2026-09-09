import { act, cleanup, fireEvent, render } from '@testing-library/preact';
import { createToaster } from 'cincin';
import { createPresenter, createPresenterHolder } from 'cincin/presenter';
import type { Presenter, PresenterHolder } from 'cincin/presenter';
import { useViewport } from './use-viewport';

const DELAY = 200;

function ViewportHost({
  presenter,
  holder,
  collapseDelay,
}: {
  presenter: Presenter;
  holder: PresenterHolder;
  collapseDelay?: number;
}) {
  const { expanded, handlers } = useViewport({
    presenter,
    holder,
    collapseDelay,
  });

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
  const holder = createPresenterHolder(presenter);
  presenter.mount();
  toaster.message('one');

  const view = render(
    <ViewportHost
      presenter={presenter}
      holder={holder}
      collapseDelay={collapseDelay}
    />
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

// Lifecycle facts only: the attention rules live in the machine's
// own suite in `cincin/dom` and are not restated here.
describe('useViewport', () => {
  it('should start folded and open on mouse enter', async () => {
    const { viewport } = setup();
    expect(isExpanded(viewport)).toBe(false);

    await act(() => {
      fireEvent.mouseEnter(viewport);
    });
    expect(isExpanded(viewport)).toBe(true);
  });

  it('should read the collapse delay from the options', async () => {
    const { viewport } = setup(50);
    await act(() => {
      fireEvent.mouseEnter(viewport);
    });
    await act(() => {
      fireEvent.mouseLeave(viewport);
    });

    await act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(isExpanded(viewport)).toBe(false);
  });

  it('should hold the presenter while open and release it on close', async () => {
    const { presenter, viewport } = setup();
    expect(paused(presenter)).toEqual([false]);

    await act(() => {
      fireEvent.mouseEnter(viewport);
    });
    expect(paused(presenter)).toEqual([true]);

    await act(() => {
      fireEvent.mouseLeave(viewport);
    });
    await act(() => {
      vi.advanceTimersByTime(DELAY);
    });
    expect(paused(presenter)).toEqual([false]);
  });

  it('should release the presenter on unmount', async () => {
    const { presenter, viewport, view } = setup();
    await act(() => {
      fireEvent.mouseEnter(viewport);
    });
    expect(paused(presenter)).toEqual([true]);

    view.unmount();
    expect(paused(presenter)).toEqual([false]);
  });

  it('should open on focus within', async () => {
    // Focus does not bubble: the adapter maps the bubbling pair.
    const { viewport, view } = setup();
    await act(() => {
      view.getByTestId('inside').focus();
    });
    expect(isExpanded(viewport)).toBe(true);
  });

  it('should fold on a pointerdown outside the stack', async () => {
    const { viewport } = setup();
    await act(() => {
      fireEvent.mouseEnter(viewport);
    });

    await act(() => {
      fireEvent.pointerDown(document.body);
    });
    await act(() => {
      vi.advanceTimersByTime(DELAY);
    });
    expect(isExpanded(viewport)).toBe(false);
  });

  it('should stop listening to the document on unmount', async () => {
    const { viewport, view } = setup();
    await act(() => {
      fireEvent.mouseEnter(viewport);
    });
    view.unmount();

    // A folded stack that nobody drives stays quiet: no throw, no
    // stray hover end reaching a destroyed controller.
    expect(() => fireEvent.pointerDown(document.body)).not.toThrow();
  });

  it('should end the hover when the stack empties', async () => {
    // The last card leaves from under a parked pointer: no mouseleave
    // arrives, so the next toast must not be born into an open stack.
    const { toaster, viewport } = setup();
    await act(() => {
      fireEvent.mouseEnter(viewport);
    });

    await act(() => {
      toaster.remove();
    });
    await act(() => {
      // The ghost finishes its exit through the safety net.
      vi.advanceTimersByTime(presenterExitMs());
    });
    await act(() => {
      vi.advanceTimersByTime(DELAY);
    });

    expect(isExpanded(viewport)).toBe(false);
  });
});
