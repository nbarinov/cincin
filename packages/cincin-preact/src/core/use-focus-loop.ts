import { createFocusLoopController, createFocusLoopHandlers } from 'cincin/dom';
import type { FocusLoopController, StackLayout } from 'cincin/dom';
import { useEffect, useState } from 'preact/hooks';

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

function useFocusLoop(options: FocusLoopOptions): FocusLoop {
  const [{ loop, handlers }] = useState(() => {
    const controller = createFocusLoopController(options.layout);
    const { element } = createFocusLoopHandlers(controller);

    return {
      loop: controller,
      handlers: {
        onFocusIn: element.focusin,
        onFocusOut: element.focusout,
        onKeyDown: element.keydown,
        onPointerDown: element.pointerdown,
        onPointerUp: element.pointerup,
        onPointerCancel: element.pointercancel,
      },
    };
  });

  useEffect(
    function mountLoop() {
      loop.mount();

      return () => loop.unmount();
    },
    [loop]
  );

  return { loop, handlers };
}

export { useFocusLoop };
export type { FocusLoopOptions, FocusLoopHandlers, FocusLoop };
