import type { Toaster, ToastId } from 'cincin';
import { attachSwipe } from 'cincin/dom';
import type { SwipeOptions } from 'cincin/dom';
import { useCallback } from 'react';
import type { RefCallback } from 'react';
import { useLatestRef } from '../shared/use-latest-ref';

type ToastSwipeOptions = Omit<SwipeOptions, 'onDismiss' | 'onRemove'> & {
  /**
   * Whether the gesture is attached at all. A non-dismissible toast
   * gets no controller: no swipe, and no touch-action claim either.
   * @default true
   */
  enabled?: boolean;
};

function useToastSwipe<T extends HTMLElement, Content extends {}>(
  toastId: ToastId,
  toaster: Toaster<Content>,
  options: ToastSwipeOptions = {}
): RefCallback<T> {
  const { enabled = true, ...swipeOptions } = options;
  const swipeOptionsRef = useLatestRef(swipeOptions);

  return useCallback(
    (el) => {
      if (!enabled || el === null) {
        return;
      }

      return attachSwipe(el, {
        ...swipeOptionsRef.current,
        onDismiss: () => toaster.dismiss(toastId),
        onRemove: () => toaster.remove(toastId),
      });
    },
    [swipeOptionsRef, toaster, toastId, options?.direction, enabled]
  );
}

export { useToastSwipe };
export type { ToastSwipeOptions };
