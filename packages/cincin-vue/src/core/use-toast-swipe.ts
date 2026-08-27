import { attachSwipe } from 'cincin/dom';
import type { SwipeDirection, SwipeOptions } from 'cincin/dom';
import type { Presenter, ToastKey } from 'cincin/presenter';
import { toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

type ToastSwipeOptions<Content extends {} = string> = Omit<
  SwipeOptions,
  'onDismiss' | 'onRemove' | 'direction'
> & {
  key: ToastKey;
  presenter: Presenter<Content>;
  /**
   * Physical swipe direction. A changed source re-attaches the
   * controller: the axis claim is a creation-time affair.
   *
   * @default 'right'
   */
  direction?: MaybeRefOrGetter<SwipeDirection>;
  /**
   * Whether the gesture is attached at all. A non-dismissible toast
   * gets no controller: no swipe, and no touch-action claim either.
   *
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;
};

/**
 * The swipe gesture on the given element, alive while the element is
 * and the option allows: attached after the DOM patch, re-attached when
 * the element, the direction or `enabled` changes, detached on unmount.
 * The key, the presenter and the tuning are read once, like the slot's
 * identities.
 */
function useToastSwipe<Content extends {}>(
  element: MaybeRefOrGetter<HTMLElement | null>,
  options: ToastSwipeOptions<Content>
): void {
  const {
    key,
    presenter,
    direction,
    enabled = true,
    ...swipeOptions
  } = options;

  watch(
    [() => toValue(element), () => toValue(enabled), () => toValue(direction)],
    ([el, isEnabled, resolvedDirection], _previous, onCleanup) => {
      if (el === null || !isEnabled) {
        return;
      }

      onCleanup(
        attachSwipe(el, {
          ...swipeOptions,
          ...(resolvedDirection !== undefined && {
            direction: resolvedDirection,
          }),
          onDismiss: () => presenter.dismiss(key),
          onRemove: () => presenter.finish(key),
        })
      );
    },
    { immediate: true, flush: 'post' }
  );
}

export { useToastSwipe };
export type { ToastSwipeOptions };
