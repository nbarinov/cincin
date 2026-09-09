import { createFocusLoopController, createFocusLoopHandlers } from 'cincin/dom';
import type { FocusLoopController, StackLayout } from 'cincin/dom';
import { onCleanup, onMount } from 'solid-js';
import type { MaybeAccessor } from '../shared/maybe-accessor';

type FocusLoopOptions = {
  layout: StackLayout;
};

type FocusLoopHandlers = {
  onFocusIn: (event: FocusEvent) => void;
  onFocusOut: (event: FocusEvent) => void;
  onKeyDown: (event: KeyboardEvent) => void;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
};

type FocusLoop = {
  /** The machine itself: `jump` is the consumer's to bind, to a hotkey or anything else. */
  loop: FocusLoopController;
  /** For the region: the loop's edge is the landmark, not the list. */
  handlers: FocusLoopHandlers;
};

function useFocusLoop(options: MaybeAccessor<FocusLoopOptions>): FocusLoop {
  // A setup-time read on purpose: the layout is read once.
  const { layout } = typeof options === 'function' ? options() : options;
  const loop = createFocusLoopController(layout);
  const { element } = createFocusLoopHandlers(loop);

  onMount(function mountLoop() {
    loop.mount();
    onCleanup(() => loop.unmount());
  });

  return {
    loop,
    handlers: {
      onFocusIn: element.focusin,
      onFocusOut: element.focusout,
      onKeyDown: element.keydown,
      onPointerDown: element.pointerdown,
      onPointerUp: element.pointerup,
      onPointerCancel: element.pointercancel,
    },
  };
}

export { useFocusLoop };
export type { FocusLoopOptions, FocusLoopHandlers, FocusLoop };
