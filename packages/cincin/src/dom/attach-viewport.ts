import type { ViewportController } from './viewport-controller';
import { createViewportHandlers } from './viewport-handlers';

type AttachViewportOptions = {
  signal?: AbortSignal;
};

/**
 * The native-listener binding over the machine, for the vanilla
 * renderer. The consumer owns the controller (it subscribes to
 * `expanded` itself); this only subscribes the shared translator on
 * the element and the document. Detach through the returned function
 * or by aborting `signal`, whichever comes first.
 */
function attachViewport(
  element: HTMLElement,
  controller: ViewportController,
  options: AttachViewportOptions = {}
): () => void {
  const viewport = createViewportHandlers(controller);
  const listeners = new AbortController();
  // The external signal is a pass-through into addEventListener, as
  // in attachHotkey; the local one serves the returned teardown.
  const signal =
    options.signal === undefined
      ? listeners.signal
      : AbortSignal.any([options.signal, listeners.signal]);

  const { element: on, document: outside } = viewport;

  element.addEventListener('mouseenter', on.mouseenter, { signal });
  element.addEventListener('mousemove', on.mousemove, { signal });
  element.addEventListener('mouseleave', on.mouseleave, { signal });
  element.addEventListener('lostpointercapture', on.lostpointercapture, {
    signal,
  });
  element.addEventListener('pointerdown', on.pointerdown, { signal });
  element.addEventListener('pointerup', on.pointerup, { signal });
  element.addEventListener('pointercancel', on.pointercancel, { signal });
  element.addEventListener('focusin', on.focusin, { signal });
  element.addEventListener('focusout', on.focusout, { signal });
  document.addEventListener('pointerdown', outside.pointerdown, { signal });

  return () => listeners.abort();
}

export { attachViewport };
export type { AttachViewportOptions };
