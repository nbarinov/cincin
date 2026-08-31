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

describe('SwipeController directions', () => {
  it('should dismiss along the vertical default, naming the actual travel', () => {
    const element = makeElement();
    const { controller, onDismiss } = makeController();

    controller.start(element, point(1, 0, 0));
    for (const y of [20, 40, 60]) {
      vi.advanceTimersByTime(16);
      controller.move(point(1, 0, y));
    }
    vi.advanceTimersByTime(200);

    expect(controller.release(point(1, 0, 60))).toBe('drag');
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(element.getAttribute('data-swipe-direction')).toBe('down');
  });

  it('should dampen toward a disallowed side and refuse the dismissal', () => {
    const element = makeElement();
    const { controller, onDismiss } = makeController();

    dragTo(controller, element, [-20, -40, -60]);

    // The offset shows the rubber band, not the hand.
    const [x] = element.style.translate.split(' ');
    expect(Number.parseFloat(x!)).toBeCloseTo(-Math.pow(60, 0.7), 5);

    // Far and fast, yet leftward is not in the set: spring back.
    expect(controller.release(point(1, -60))).toBe('drag');
    expect(onDismiss).not.toHaveBeenCalled();
    expect(element.style.translate).toBe('0px 0px');
  });

  it('should free the axis when both of its signs are allowed', () => {
    const element = makeElement();
    const { controller, onDismiss } = makeController({
      directions: ['left', 'right'],
    });

    dragTo(controller, element, [-20, -40, -60]);

    // No "against" side on a free axis: the card follows the hand.
    expect(element.style.translate).toBe('-60px 0px');

    expect(controller.release(point(1, -60))).toBe('drag');
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(element.getAttribute('data-swipe-direction')).toBe('left');
  });

  it('should treat an axis with no allowed direction as foreign', () => {
    const element = makeElement();
    const { controller, onDismiss } = makeController({
      directions: ['left', 'right'],
    });

    controller.start(element, point(1, 0, 0));
    vi.advanceTimersByTime(16);
    controller.move(point(1, 2, 20));

    expect(element.hasAttribute('data-swiping')).toBe(false);
    expect(element.style.translate).toBe('0px 0px');
    expect(controller.release(point(1, 2, 20))).toBe('tap');
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('should warn on an empty set and treat every gesture as foreign', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const element = makeElement();
    const { controller, onDismiss } = makeController({ directions: [] });

    expect(warn).toHaveBeenCalledTimes(1);

    dragTo(controller, element, [20, 40, 60]);

    expect(element.hasAttribute('data-swiping')).toBe(false);
    expect(controller.release(point(1, 60))).toBe('tap');
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe('SwipeController caught spring', () => {
  /** Binds the channel with a tap, then plants a pinned offset: in
   * jsdom the computed style mirrors the inline one, so the written
   * translate stands in for a mid-spring computed value. */
  function catchSpringAt(
    controller: ReturnType<typeof makeController>['controller'],
    element: HTMLElement,
    translate: string
  ): void {
    controller.start(element, point(9, 500));
    controller.release(point(9, 500));
    element.style.translate = translate;
  }

  it('should continue from the pinned offset on a same-axis re-grab', () => {
    const element = makeElement();
    const { controller } = makeController();
    catchSpringAt(controller, element, '12px 0px');

    controller.start(element, point(1, 0));
    vi.advanceTimersByTime(16);
    controller.move(point(1, 10));

    expect(element.style.translate).toBe('22px 0px');
  });

  it('should forfeit the orphaned component on a cross-axis re-grab', () => {
    const element = makeElement();
    const { controller } = makeController();
    catchSpringAt(controller, element, '12px 0px');

    controller.start(element, point(1, 0, 0));
    vi.advanceTimersByTime(16);
    controller.move(point(1, 0, 20));

    // The x remainder is dropped, bounded by what the spring had left.
    expect(element.style.translate).toBe('0px 20px');
  });

  it('should send a caught spring home when the grab ends as a tap', () => {
    // The hole this pins: without the settle-time spring the card hung
    // at the pinned offset forever, nothing downstream would move it.
    const element = makeElement();
    const { controller } = makeController();
    catchSpringAt(controller, element, '12px 0px');
    const animate = vi.spyOn(Element.prototype, 'animate');

    controller.start(element, point(1, 0));
    expect(controller.release(point(1, 0))).toBe('tap');

    expect(element.style.translate).toBe('0px 0px');
    expect(animate).toHaveBeenCalledWith(
      [{ translate: '12px 0px' }, { translate: '0px 0px' }],
      { duration: 300, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    );
  });

  it('should send a caught spring home after a foreign-axis gesture', () => {
    const element = makeElement();
    const { controller } = makeController({ directions: ['right'] });
    catchSpringAt(controller, element, '12px 0px');

    controller.start(element, point(1, 0, 0));
    vi.advanceTimersByTime(16);
    controller.move(point(1, 2, 20));

    expect(controller.release(point(1, 2, 20))).toBe('tap');
    expect(element.style.translate).toBe('0px 0px');
  });
});
