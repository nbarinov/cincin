import { attachSwipe } from 'cincin/dom';
import type { SwipeOptions } from 'cincin/dom';
import { useCallback } from 'react';
import type { RefCallback } from 'react';
import { useLatestRef } from '../shared/use-latest-ref';
import type { Presenter, PresentationKey } from 'cincin/presenter';

type ToastSwipeOptions = Omit<SwipeOptions, 'onDismiss' | 'onRemove'> & {
  /**
   * Whether the gesture is attached at all. A non-dismissible toast
   * gets no controller: no swipe, and no touch-action claim either.
   * @default true
   */
  enabled?: boolean;
};

function useToastSwipe<T extends HTMLElement, Content extends {}>(
  key: PresentationKey,
  presenter: Presenter<Content>,
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
        onDismiss: () => presenter.dismiss(key),
        onRemove: () => presenter.finish(key),
      });
    },
    [swipeOptionsRef, presenter, key, options?.direction, enabled]
  );
}

export { useToastSwipe };
export type { ToastSwipeOptions };
