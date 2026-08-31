import {
  createSwipeController,
  createSwipeHandlers,
  touchActionFor,
} from 'cincin/dom';
import type { SwipeDirection, SwipeOptions } from 'cincin/dom';
import type { Presenter, ToastKey } from 'cincin/presenter';
import { computed, onScopeDispose, shallowRef, toValue, watch } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

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
  directions?: MaybeRefOrGetter<readonly SwipeDirection[] | undefined>;
  /**
   * Whether the gesture exists at all. A non-dismissible toast gets
   * no swipe: no handlers, and no touch-action claim either.
   *
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;
};

type ToastSwipeHandlers = {
  pointerdown: (event: PointerEvent) => void;
  pointermove: (event: PointerEvent) => void;
  pointerup: (event: PointerEvent) => void;
  pointercancel: (event: PointerEvent) => void;
  /** `v-on` reads the suffix: a capture-phase click listener. */
  clickCapture: (event: MouseEvent) => void;
};

type ToastSwipe = {
  /**
   * Bind onto the swiped element: `v-on="handlers"`.
   * Empty while disabled: `v-on` digests an empty object without ceremony.
   */
  handlers: ComputedRef<ToastSwipeHandlers | Record<string, never>>;
  /**
   * The static touch-action claim: the browser must know the reserved
   * axis before any gesture, so it travels declaratively with
   * the element. `undefined` while disabled.
   */
  style: ComputedRef<{ touchAction: 'pan-y' | 'pan-x' | 'none' } | undefined>;
};

/**
 * The handlers translate native events into the gesture protocol (the
 * machine takes the element lazily from the first `start`), so no
 * element ref is involved. The controller is recreated on the
 * directions source (watched by its joined contents, not the array
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

  const create = () => {
    const resolved = toValue(directions);

    return createSwipeController({
      ...tuning,
      ...(resolved !== undefined && { directions: resolved }),
      onDismiss: () => presenter.dismiss(key),
      onRemove: () => presenter.finish(key),
    });
  };

  const controller = shallowRef(create());

  watch(
    () => toValue(directions)?.join(' '),
    () => {
      controller.value.destroy();
      controller.value = create();
    }
  );

  onScopeDispose(() => controller.value.destroy());

  const isEnabled = computed(() => toValue(enabled));

  watch(isEnabled, (value) => {
    if (!value) {
      controller.value.destroy();
    }
  });

  const handlers = computed<ToastSwipeHandlers>(() => {
    const swipe = createSwipeHandlers(controller.value);

    return {
      pointerdown: swipe.pointerdown,
      pointermove: swipe.pointermove,
      pointerup: swipe.pointerup,
      pointercancel: swipe.pointercancel,
      clickCapture: swipe.click,
    };
  });

  return {
    handlers: computed(() => (isEnabled.value ? handlers.value : IDLE)),
    style: computed(() =>
      isEnabled.value
        ? { touchAction: touchActionFor(controller.value.directions) }
        : undefined
    ),
  };
}

const IDLE: Record<string, never> = {};

export { useToastSwipe };
export type { ToastSwipeOptions, ToastSwipeHandlers, ToastSwipe };
