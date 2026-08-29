import { createSwipeController } from './swipe-controller';
import type { SwipeOptions } from './swipe-controller';
import { createSwipeHandlers } from './swipe-handlers';
import { assignStyle, touchActionFor } from './utils';

/**
 * The native-listener binding over the swipe machine, for imperative
 * consumers (the vanilla skin). The shared translator does the
 * event-to-protocol work; this layer only subscribes it and claims
 * touch-action imperatively. Framework adapters subscribe the same
 * translator in their own idiom instead of calling this.
 */
function attachSwipe(element: HTMLElement, options: SwipeOptions): () => void {
  const controller = createSwipeController(options);
  const swipe = createSwipeHandlers(controller);
  const restoreTouchAction = assignStyle(element, {
    touchAction: touchActionFor(controller.direction),
  });

  const listeners = new AbortController();
  const { signal } = listeners;

  element.addEventListener('pointerdown', swipe.pointerdown, { signal });
  element.addEventListener('pointermove', swipe.pointermove, { signal });
  element.addEventListener('pointerup', swipe.pointerup, { signal });
  element.addEventListener('pointercancel', swipe.pointercancel, { signal });
  element.addEventListener('click', swipe.click, { capture: true, signal });

  return () => {
    listeners.abort();
    restoreTouchAction();
    controller.destroy();
  };
}

export { attachSwipe };
export type { SwipeOptions };
export type { SwipeDirection } from './gesture';
