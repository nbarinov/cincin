import { cleanup, fireEvent, render } from '@testing-library/vue';
import { createToaster } from 'cincin';
import { createPresenter, createPresenterHolder } from 'cincin/presenter';
import type { Presenter } from 'cincin/presenter';
import { defineComponent, h, nextTick, toHandlers } from 'vue';
import { useViewport } from './use-viewport';

const DELAY = 200;

function setup(collapseDelay?: number) {
  const toaster = createToaster();
  const presenter = createPresenter(toaster);
  const holder = createPresenterHolder(presenter);
  presenter.mount();
  toaster.message('one');

  const Host = defineComponent({
    setup() {
      const { expanded, handlers } = useViewport({
        presenter,
        holder,
        collapseDelay,
      });

      return () =>
        h(
          'ol',
          {
            'data-testid': 'viewport',
            'data-expanded': String(expanded.value),
            ...toHandlers(handlers),
          },
          [
            h('li', [
              h('button', {
                type: 'button',
                'data-testid': 'inside',
                'aria-label': 'Dismiss',
              }),
            ]),
          ]
        );
    },
  });

  const view = render(Host);
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

/** Runs the pending fold and lets the DOM patch through. */
async function settle(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms);
  await nextTick();
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

    await fireEvent.mouseEnter(viewport);
    expect(isExpanded(viewport)).toBe(true);
  });

  it('should read the collapse delay from the options', async () => {
    const { viewport } = setup(50);
    await fireEvent.mouseEnter(viewport);
    await fireEvent.mouseLeave(viewport);

    await settle(50);
    expect(isExpanded(viewport)).toBe(false);
  });

  it('should hold the presenter while open and release it on close', async () => {
    const { presenter, viewport } = setup();
    expect(paused(presenter)).toEqual([false]);

    await fireEvent.mouseEnter(viewport);
    expect(paused(presenter)).toEqual([true]);

    await fireEvent.mouseLeave(viewport);
    await settle(DELAY);
    expect(paused(presenter)).toEqual([false]);
  });

  it('should release the presenter on unmount', async () => {
    const { presenter, viewport, view } = setup();
    await fireEvent.mouseEnter(viewport);
    expect(paused(presenter)).toEqual([true]);

    view.unmount();
    expect(paused(presenter)).toEqual([false]);
  });

  it('should open on focus within', async () => {
    // Focus does not bubble: the adapter maps the bubbling pair.
    const { viewport, inside } = setup();
    inside.focus();
    await nextTick();
    expect(isExpanded(viewport)).toBe(true);
  });

  it('should fold on a pointerdown outside the stack', async () => {
    const { viewport } = setup();
    await fireEvent.mouseEnter(viewport);

    await fireEvent.pointerDown(document.body);
    await settle(DELAY);
    expect(isExpanded(viewport)).toBe(false);
  });

  it('should stop listening to the document on unmount', async () => {
    const { viewport, view } = setup();
    await fireEvent.mouseEnter(viewport);
    view.unmount();

    // A folded stack that nobody drives stays quiet: no throw, no
    // stray hover end reaching a destroyed controller.
    await expect(fireEvent.pointerDown(document.body)).resolves.not.toThrow();
  });

  it('should end the hover when the stack empties', async () => {
    // The last card leaves from under a parked pointer: no mouseleave
    // arrives, so the next toast must not be born into an open stack.
    const { toaster, viewport } = setup();
    await fireEvent.mouseEnter(viewport);

    toaster.remove();
    // The ghost finishes its exit through the safety net.
    await settle(presenterExitMs());
    await settle(DELAY);

    expect(isExpanded(viewport)).toBe(false);
  });
});
