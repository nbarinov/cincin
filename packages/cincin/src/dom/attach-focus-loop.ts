import type { FocusLoopController } from './focus-loop-controller';
import { createFocusLoopHandlers } from './focus-loop-handlers';

type AttachFocusLoopOptions = {
  signal?: AbortSignal;
};

/**
 * The native-listener binding over the loop, for the vanilla
 * renderer. The consumer owns the controller (it mounts it next to
 * the presenter, and binds a hotkey to `jump` if it wants one); this
 * only subscribes the shared translator on the element. Detach
 * through the returned function or by aborting `signal`, whichever
 * comes first.
 */
function attachFocusLoop(
  element: HTMLElement,
  controller: FocusLoopController,
  options: AttachFocusLoopOptions = {}
): () => void {
  const { element: on } = createFocusLoopHandlers(controller);
  const listeners = new AbortController();
  const signal =
    options.signal === undefined
      ? listeners.signal
      : AbortSignal.any([options.signal, listeners.signal]);

  element.addEventListener('focusin', on.focusin, { signal });
  element.addEventListener('focusout', on.focusout, { signal });
  element.addEventListener('keydown', on.keydown, { signal });
  element.addEventListener('pointerdown', on.pointerdown, { signal });
  element.addEventListener('pointerup', on.pointerup, { signal });
  element.addEventListener('pointercancel', on.pointercancel, { signal });

  return () => listeners.abort();
}

export { attachFocusLoop };
export type { AttachFocusLoopOptions };
