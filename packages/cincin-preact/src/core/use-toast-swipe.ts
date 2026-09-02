import type { Presenter, ToastKey } from 'cincin/presenter';
import type { SwipeOptions } from 'cincin/dom';
import {
  createSwipeController,
  createSwipeHandlers,
  touchActionFor,
} from 'cincin/dom';
import { useEffect, useLayoutEffect, useMemo } from 'preact/hooks';
import { useLatestRef } from '../shared/use-latest-ref';

type ToastSwipeOptions<Content extends {} = string> = Omit<
  SwipeOptions,
  'onDismiss' | 'onRemove'
> & {
  key: ToastKey;
  presenter: Presenter<Content>;
  /**
   * Whether the gesture exists at all. A non-dismissible toast gets
   * no swipe: no handlers, and no touch-action claim either.
   *
   * @default true
   */
  enabled?: boolean;
};

/** Preact hands the handlers native events; no synthetic wrapper. */
type ToastSwipeHandlers = {
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onPointerCancel: (event: PointerEvent) => void;
  onClickCapture: (event: MouseEvent) => void;
};

type ToastSwipeStyle = {
  touchAction: 'pan-y' | 'pan-x' | 'none';
};

type ToastSwipe = {
  /** Spread onto the swiped element. `undefined` while disabled. */
  handlers: ToastSwipeHandlers | undefined;
  /**
   * The static touch-action claim: the browser must know the reserved
   * axis before any gesture, so it travels declaratively with the
   * element. `undefined` while disabled.
   */
  style: ToastSwipeStyle | undefined;
};

/**
 * The handlers translate native events into the gesture protocol
 * (the machine takes the element lazily from the first `start`),
 * and the trailing click the browser synthesizes after a drag
 * is spent by the capture handler on the translator's claim.
 * The controller is recreated on the read-once identities
 * (key, presenter, directions); the tuning rides `setOptions` and lands before paint.
 * `enabled` only projects the return: the lazy machine costs nothing
 * behind a disabled toast, and re-enabling keeps the handler identities.
 */
function useToastSwipe<Content extends {}>(
  options: ToastSwipeOptions<Content>
): ToastSwipe {
  const { key, presenter, enabled = true, directions, ...tuning } = options;
  const tuningRef = useLatestRef(tuning);

  const controller = useMemo(
    () =>
      createSwipeController({
        ...tuningRef.current,
        directions,
        onDismiss: () => presenter.dismiss(key),
        onRemove: () => presenter.finish(key),
      }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- directions is a value, not an identity
    [key, presenter, tuningRef, directions?.join(' ')]
  );

  useLayoutEffect(
    function syncTuning() {
      controller.setOptions(tuning);
    },
    [controller, tuning]
  );

  useLayoutEffect(
    function settleOnDisable() {
      if (!enabled) {
        controller.destroy();
      }
    },
    [enabled, controller]
  );

  useEffect(
    function destroyController() {
      return () => controller.destroy();
    },
    [controller]
  );

  const handlers = useMemo<ToastSwipeHandlers>(() => {
    const swipe = createSwipeHandlers(controller);

    return {
      onPointerDown: swipe.pointerdown,
      onPointerMove: swipe.pointermove,
      onPointerUp: swipe.pointerup,
      onPointerCancel: swipe.pointercancel,
      onClickCapture: swipe.click,
    };
  }, [controller]);

  if (!enabled) {
    return { handlers: undefined, style: undefined };
  }

  return {
    handlers,
    style: { touchAction: touchActionFor(controller.directions) },
  };
}

export { useToastSwipe };
export type {
  ToastSwipeOptions,
  ToastSwipeHandlers,
  ToastSwipeStyle,
  ToastSwipe,
};
