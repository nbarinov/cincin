import { prefersReducedMotion } from 'cincin/dom';
import type { ToastKey, Presenter } from 'cincin/presenter';
import type { TransitionEvent, AnimationEvent } from 'react';
import { useCallback, useEffect } from 'react';

type ToastExitEvent = TransitionEvent | AnimationEvent;

function useToastExit<Content extends {}>(
  key: ToastKey,
  presenter: Presenter<Content>
): (event: ToastExitEvent) => void {
  useEffect(
    function subscribeReducedMotionRemoval() {
      return presenter.subscribe((e) => {
        if (
          prefersReducedMotion() &&
          e.type === 'leaving' &&
          e.toast.key === key
        ) {
          queueMicrotask(() => presenter.finish(key));
        }
      });
    },
    [key, presenter]
  );

  return useCallback(
    (e: ToastExitEvent) => {
      const el = e.currentTarget;
      const dismissing = presenter
        .getSnapshot()
        .some((p) => p.key === key && p.phase === 'leaving');

      if (
        e.target === el &&
        dismissing &&
        !el.hasAttribute('data-swipe-direction')
      ) {
        presenter.finish(key);
      }
    },
    [key, presenter]
  );
}

export { useToastExit };
export type { ToastExitEvent };
