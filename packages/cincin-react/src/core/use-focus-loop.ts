import { createFocusLoopController, createFocusLoopHandlers } from 'cincin/dom';
import type { FocusLoopController, StackLayout } from 'cincin/dom';
import * as React from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';

type FocusLoopOptions = {
  layout: StackLayout;
};

type FocusLoopHandlers<T extends HTMLElement> = {
  onFocus: (event: FocusEvent<T>) => void;
  onBlur: (event: FocusEvent<T>) => void;
  onKeyDown: (event: KeyboardEvent<T>) => void;
};

type FocusLoop<T extends HTMLElement> = {
  /** The machine itself: `jump` is the consumer's to bind, to a hotkey or anything else. */
  loop: FocusLoopController;
  /** For the region: the loop's edge is the landmark, not the list. */
  handlers: FocusLoopHandlers<T>;
};

function useFocusLoop<T extends HTMLElement>(
  options: FocusLoopOptions
): FocusLoop<T> {
  const [{ loop, handlers }] = React.useState(() => {
    const controller = createFocusLoopController(options.layout);
    const { element } = createFocusLoopHandlers<
      FocusEvent<T>,
      FocusEvent<T>,
      KeyboardEvent<T>
    >(controller);

    return {
      loop: controller,
      handlers: {
        onFocus: element.focusin,
        onBlur: element.focusout,
        onKeyDown: element.keydown,
      },
    };
  });

  React.useEffect(
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
