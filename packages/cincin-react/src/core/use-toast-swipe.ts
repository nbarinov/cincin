import type { Toaster, ToastId } from 'cincin';
import { attachSwipe } from 'cincin/dom';
import type { SwipeOptions } from 'cincin/dom';
import { useCallback } from 'react';
import type { RefCallback } from 'react';
import { useLatestRef } from '../shared/use-latest-ref';

type ToastSwipeOptions = Omit<SwipeOptions, 'onDismiss' | 'onRemove'>;

function useToastSwipe<T extends HTMLElement, Content extends {}>(
  toastId: ToastId,
  toaster: Toaster<Content>,
  options?: ToastSwipeOptions
): RefCallback<T> {
  const optionsRef = useLatestRef(options);

  return useCallback(
    (el) => {
      if (el === null) {
        return;
      }

      return attachSwipe(el, {
        ...optionsRef.current,
        onDismiss: () => toaster.dismiss(toastId),
        onRemove: () => toaster.remove(toastId),
      });
    },
    [optionsRef, toaster, toastId, options?.direction]
  );
}

export { useToastSwipe };
export type { ToastSwipeOptions };
