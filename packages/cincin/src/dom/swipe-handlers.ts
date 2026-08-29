import type { SwipeController, SwipePoint } from './swipe-controller';

type PointerEventLike = Pick<
  PointerEvent,
  'pointerId' | 'clientX' | 'clientY' | 'isPrimary' | 'currentTarget'
>;

type ClickEventLike = Pick<Event, 'preventDefault' | 'stopPropagation'> &
  Partial<Pick<Event, 'stopImmediatePropagation'>>;

type SwipeHandlers<
  P extends PointerEventLike = PointerEvent,
  C extends ClickEventLike = MouseEvent,
> = {
  pointerdown(event: P): void;
  pointermove(event: P): void;
  pointerup(event: P): void;
  pointercancel(event: P): void;
  click(event: C): void;
};

/** The browser synthesizes the trailing click within this window. */
const CLICK_WINDOW = 400;

/**
 * The event-to-protocol translator, shared by the adapters:
 * the machine never sees events, and the adapters never repeat
 * the plumbing (the primary-contact filter, the point extraction,
 * the trailing-click consumption).
 */
function createSwipeHandlers<
  P extends PointerEventLike = PointerEvent,
  C extends ClickEventLike = MouseEvent,
>(controller: SwipeController): SwipeHandlers<P, C> {
  let claimedUntil = 0;

  return {
    pointerdown(event) {
      claimedUntil = 0;

      if (event.isPrimary && event.currentTarget instanceof HTMLElement) {
        controller.start(event.currentTarget, point(event));
      }
    },
    pointermove(event) {
      controller.move(point(event));
    },
    pointerup(event) {
      const result = controller.release(point(event));
      if (result === 'drag') {
        claimedUntil = performance.now() + CLICK_WINDOW;
      }
    },
    pointercancel(event) {
      controller.cancel(point(event));
    },
    click(event) {
      const claimed = performance.now() < claimedUntil;
      claimedUntil = 0;

      if (!claimed) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    },
  };
}

export { createSwipeHandlers };
export type { SwipeHandlers, PointerEventLike, ClickEventLike };

// utils

function point(event: PointerEventLike): SwipePoint {
  return { id: event.pointerId, x: event.clientX, y: event.clientY };
}
