import { createSwipeController } from './swipe-controller';
import type { SwipeOptions, SwipePoint } from './swipe-controller';
import { makeElement } from './test-helpers';

/** The protocol speaks plain points: no events, no dispatch. */
function point(id: number, x: number, y = 0): SwipePoint {
  return { id, x, y };
}

function makeController(overrides: Partial<SwipeOptions> = {}) {
  const onDismiss = vi.fn();
  const onRemove = vi.fn();
  const controller = createSwipeController({
    onDismiss,
    onRemove,
    ...overrides,
  });

  return { controller, onDismiss, onRemove };
}

/** Feeds a horizontal drag with controlled timing, without releasing.
 * The 16ms cadence is a fast hand: it passes the velocity gate. */
function dragTo(
  controller: ReturnType<typeof makeController>['controller'],
  element: HTMLElement,
  positions: number[],
  stepMs = 16
): void {
  controller.start(element, point(1, 0));
  for (const x of positions) {
    vi.advanceTimersByTime(stepMs);
    controller.move(point(1, x));
  }
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('SwipeController', () => {
  it('should claim nothing before the first start', () => {
    const element = makeElement();
    const { controller } = makeController();

    expect(element.style.translate).toBe('');

    // A never-touched controller has nothing to release either.
    controller.destroy();
    expect(element.style.translate).toBe('');
  });

  it('should report a tap for a release without movement', () => {
    const element = makeElement();
    const { controller, onDismiss } = makeController();

    controller.start(element, point(1, 0));

    expect(controller.release(point(1, 0))).toBe('tap');
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('should report a drag and spring back below the thresholds', () => {
    const element = makeElement();
    const { controller, onDismiss } = makeController();

    // A slow crawl: 20px stays under the distance gate, and the wide
    // steps keep the trailing velocity under the flick gate.
    dragTo(controller, element, [10, 20], 100);

    expect(controller.release(point(1, 20))).toBe('drag');
    expect(onDismiss).not.toHaveBeenCalled();
    expect(element.style.translate).toBe('0px 0px');
  });

  it('should dismiss past the distance threshold', () => {
    const element = makeElement();
    const { controller, onDismiss } = makeController();

    dragTo(controller, element, [20, 40, 60]);
    vi.advanceTimersByTime(200);

    expect(controller.release(point(1, 60))).toBe('drag');
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(element.getAttribute('data-swipe-direction')).toBe('right');
  });

  it('should ignore foreign contacts', () => {
    const element = makeElement();
    const { controller } = makeController();

    dragTo(controller, element, [20, 40, 60]);

    // A stray second finger neither moves nor ends the gesture.
    controller.move(point(2, 500));
    expect(controller.release(point(2, 500))).toBe('tap');

    expect(controller.release(point(1, 60))).toBe('drag');
  });

  it('should only spring back on cancel, regardless of thresholds', () => {
    const element = makeElement();
    const { controller, onDismiss } = makeController();

    dragTo(controller, element, [30, 90]);
    controller.cancel(point(1, 90));

    expect(onDismiss).not.toHaveBeenCalled();
    expect(element.style.translate).toBe('0px 0px');
    expect(element.hasAttribute('data-swiping')).toBe(false);
  });

  it('should rebind the channel on a node swap', () => {
    const first = makeElement();
    const second = makeElement();
    const { controller } = makeController();

    // A tap binds the channel without entering the exit phase (an
    // exiting toast is not grabbable, let alone rebindable).
    controller.start(first, point(1, 0));
    controller.release(point(1, 0));

    controller.start(second, point(1, 0));

    // The old element's claims are returned, the new one is claimed.
    expect(first.style.translate).toBe('');
    expect(second.style.translate).toBe('0px 0px');
  });
});
