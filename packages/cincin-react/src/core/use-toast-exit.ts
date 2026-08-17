import type { ToastId, Toaster } from 'cincin';
import { prefersReducedMotion } from 'cincin/dom';
import type { TransitionEvent, AnimationEvent } from 'react';
import { useCallback, useEffect } from 'react';

type ToastExitEvent = TransitionEvent | AnimationEvent;

function useToastExit<Content extends {}>(
  toastId: ToastId,
  toaster: Toaster<Content>
): (event: ToastExitEvent) => void {
  useEffect(
    function subscribeReducedMotionRemoval() {
      return toaster.subscribe((e) => {
        if (
          prefersReducedMotion() &&
          e.type === 'dismissed' &&
          e.toast.id === toastId
        ) {
          queueMicrotask(() => toaster.remove(toastId));
        }
      });
    },
    [toastId, toaster]
  );

  return useCallback(
    (e: ToastExitEvent) => {
      const el = e.currentTarget;
      const dismissing = toaster
        .getSnapshot()
        .some((toast) => toast.id === toastId && toast.status === 'dismissing');

      if (
        e.target === el &&
        dismissing &&
        !el.hasAttribute('data-swipe-direction')
      ) {
        toaster.remove(toastId);
      }
    },
    [toastId, toaster]
  );
}

export { useToastExit };
export type { ToastExitEvent };
