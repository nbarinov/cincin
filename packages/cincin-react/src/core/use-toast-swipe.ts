import type { Presenter, ToastKey } from 'cincin/presenter';
import type { SwipeDirection, SwipeOptions } from 'cincin/dom';
import {
  createSwipeController,
  createSwipeHandlers,
  touchActionFor,
} from 'cincin/dom';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import type { CSSProperties, MouseEvent, PointerEvent } from 'react';
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

type ToastSwipeHandlers<T extends HTMLElement> = {
  onPointerDown: (event: PointerEvent<T>) => void;
  onPointerMove: (event: PointerEvent<T>) => void;
  onPointerUp: (event: PointerEvent<T>) => void;
  onPointerCancel: (event: PointerEvent<T>) => void;
  onClickCapture: (event: MouseEvent<T>) => void;
};

type ToastSwipe<T extends HTMLElement> = {
  /** Spread onto the swiped element. `undefined` while disabled. */
  handlers: ToastSwipeHandlers<T> | undefined;
  /**
   * The static touch-action claim: the browser must know the reserved
   * axis before any gesture, so it travels declaratively with the
   * element. `undefined` while disabled.
   */
  style: CSSProperties | undefined;
};

/**
 * The handlers translate synthetic events into the gesture protocol
 * (the machine takes the element lazily from the first `start`),
 * and the trailing click the browser synthesizes after a drag
 * is spent by the capture handler on the translator's claim.
 * The controller is recreated on the read-once identities
 * (key, presenter, directions); the tuning rides `setOptions` and lands before paint.
 * `enabled` only projects the return: the lazy machine costs nothing
 * behind a disabled toast, and re-enabling keeps the handler identities.
 */
function useToastSwipe<T extends HTMLElement, Content extends {}>(
  options: ToastSwipeOptions<Content>
): ToastSwipe<T> {
  const { key, presenter, enabled = true, directions, ...tuning } = options;
  const tuningRef = useLatestRef(tuning);

  const controller = useMemo(
    () =>
      createSwipeController({
        ...tuningRef.current,
        ...(directions !== undefined && { directions }),
        onDismiss: () => presenter.dismiss(key),
        onRemove: () => presenter.finish(key),
      }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- directions is a value, not an identity
    [key, presenter, tuningRef, directions?.join(' ')]
  );

  useLayoutEffect(
    function syncTuning() {
      const { drag, dismiss, fling, cancel } = tuning;

      controller.setOptions({
        ...(drag !== undefined && { drag }),
        ...(dismiss !== undefined && { dismiss }),
        ...(fling !== undefined && { fling }),
        ...(cancel !== undefined && { cancel }),
      });
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

  const handlers = useMemo<ToastSwipeHandlers<T>>(() => {
    const swipe = createSwipeHandlers<PointerEvent<T>, MouseEvent<T>>(
      controller
    );

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
export type { ToastSwipeOptions, ToastSwipeHandlers, ToastSwipe };
