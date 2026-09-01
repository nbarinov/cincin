import {
  createSwipeController,
  createSwipeHandlers,
  touchActionFor,
} from 'cincin/dom';
import type { SwipeDirection, SwipeOptions } from 'cincin/dom';
import type { Presenter, ToastKey } from 'cincin/presenter';
import { createMemo, createRenderEffect, on, onCleanup } from 'solid-js';
import type { Accessor } from 'solid-js';
import { access } from '../shared/maybe-accessor';
import type { MaybeAccessor } from '../shared/maybe-accessor';

type ToastSwipeOptions<Content extends {} = string> = Omit<
  SwipeOptions,
  'onDismiss' | 'onRemove' | 'directions'
> & {
  key: ToastKey;
  presenter: Presenter<Content>;
  /**
   * Directions a swipe may dismiss along. A changed source recreates
   * the controller: the axes claim is a creation-time affair.
   *
   * @default ['right', 'down']
   */
  directions?: MaybeAccessor<readonly SwipeDirection[] | undefined>;
  /**
   * Whether the gesture exists at all. A non-dismissible toast gets
   * no swipe: no handlers, and no touch-action claim either.
   *
   * @default true
   */
  enabled?: MaybeAccessor<boolean>;
};

type ToastSwipeHandlers = {
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onPointerCancel: (event: PointerEvent) => void;
  /** Solid reads the prefix in a spread: a capture-phase click listener. */
  'oncapture:click': (event: MouseEvent) => void;
};

type ToastSwipe = {
  /**
   * Spread onto the swiped element: `{...swipe.handlers()}`.
   * Empty while disabled: a spread digests an empty object without
   * ceremony.
   */
  handlers: Accessor<ToastSwipeHandlers | Record<string, never>>;
  /**
   * The static touch-action claim: the browser must know the reserved
   * axis before any gesture, so it travels declaratively with
   * the element. `undefined` while disabled.
   */
  style: Accessor<{ 'touch-action': 'pan-y' | 'pan-x' | 'none' } | undefined>;
};

/**
 * The handlers translate native events into the gesture protocol (the
 * machine takes the element lazily from the first `start`), so no
 * element ref is involved. The controller is recreated on the
 * directions source (keyed by its joined contents, not the array
 * identity, so an inline literal getter does not churn it); the key,
 * the presenter and the tuning are read once, like the slot's
 * identities. `enabled` only projects the return: the lazy machine
 * costs nothing behind a disabled toast, and disabling mid-gesture
 * settles through destroy.
 */
function useToastSwipe<Content extends {}>(
  options: ToastSwipeOptions<Content>
): ToastSwipe {
  const { key, presenter, directions, enabled = true, ...tuning } = options;

  const directionsKey = createMemo(() => access(directions)?.join(' '));

  // `on` keeps the body untracked, so the fresh directions read inside
  // does not double-subscribe the memo to the source itself; the
  // cleanup rides the memo and destroys the outgoing instance on
  // recreation and on dispose alike.
  const controller = createMemo(
    on(directionsKey, () => {
      const instance = createSwipeController({
        ...tuning,
        directions: access(directions),
        onDismiss: () => presenter.dismiss(key),
        onRemove: () => presenter.finish(key),
      });

      onCleanup(() => instance.destroy());

      return instance;
    })
  );

  const isEnabled = createMemo(() => access(enabled) ?? true);

  createRenderEffect(
    on(isEnabled, (value) => {
      if (!value) {
        controller().destroy();
      }
    })
  );

  const handlers = createMemo<ToastSwipeHandlers>(() => {
    const swipe = createSwipeHandlers(controller());

    return {
      onPointerDown: swipe.pointerdown,
      onPointerMove: swipe.pointermove,
      onPointerUp: swipe.pointerup,
      onPointerCancel: swipe.pointercancel,
      'oncapture:click': swipe.click,
    };
  });

  return {
    handlers: () => (isEnabled() ? handlers() : IDLE),
    style: () =>
      isEnabled()
        ? { 'touch-action': touchActionFor(controller().directions) }
        : undefined,
  };
}

const IDLE: Record<string, never> = {};

export { useToastSwipe };
export type { ToastSwipeOptions, ToastSwipeHandlers, ToastSwipe };
