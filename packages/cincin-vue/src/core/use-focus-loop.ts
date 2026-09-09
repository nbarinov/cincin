import { createFocusLoopController, createFocusLoopHandlers } from 'cincin/dom';
import type { FocusLoopController, StackLayout } from 'cincin/dom';
import { onMounted, onUnmounted, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

type FocusLoopOptions = {
  layout: StackLayout;
};

type FocusLoopHandlers = {
  focusin: (event: FocusEvent) => void;
  focusout: (event: FocusEvent) => void;
  keydown: (event: KeyboardEvent) => void;
  pointerdown: () => void;
  pointerup: () => void;
  pointercancel: () => void;
};

type FocusLoop = {
  /** The machine itself: `jump` is the consumer's to bind, to a hotkey or anything else. */
  loop: FocusLoopController;
  /** For the region: the loop's edge is the landmark, not the list. */
  handlers: FocusLoopHandlers;
};

function useFocusLoop(options: MaybeRefOrGetter<FocusLoopOptions>): FocusLoop {
  // A setup-time read on purpose: the layout is read once.
  const { layout } = toValue(options);
  const loop = createFocusLoopController(layout);
  const { element } = createFocusLoopHandlers(loop);

  onMounted(() => loop.mount());
  onUnmounted(() => loop.unmount());

  return {
    loop,
    handlers: {
      focusin: element.focusin,
      focusout: element.focusout,
      keydown: element.keydown,
      pointerdown: element.pointerdown,
      pointerup: element.pointerup,
      pointercancel: element.pointercancel,
    },
  };
}

export { useFocusLoop };
export type { FocusLoopOptions, FocusLoopHandlers, FocusLoop };
