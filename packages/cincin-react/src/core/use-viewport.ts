import type { Presenter, PresenterHolder } from 'cincin/presenter';
import { createViewportController, createViewportHandlers } from 'cincin/dom';
import type { ViewportOptions as ControllerOptions } from 'cincin/dom';
import * as React from 'react';
import type { FocusEvent, SyntheticEvent } from 'react';

type ViewportOptions = ControllerOptions & {
  presenter: Presenter<{}>;
  holder?: PresenterHolder;
};

type ViewportHandlers<T extends HTMLElement> = {
  onMouseEnter: (event: SyntheticEvent<T>) => void;
  onMouseMove: (event: SyntheticEvent<T>) => void;
  onMouseLeave: (event: SyntheticEvent<T>) => void;
  onLostPointerCapture: (event: SyntheticEvent<T>) => void;
  onPointerDown: (event: SyntheticEvent<T>) => void;
  onPointerUp: (event: SyntheticEvent<T>) => void;
  onPointerCancel: (event: SyntheticEvent<T>) => void;
  onFocus: (event: SyntheticEvent<T>) => void;
  onBlur: (event: FocusEvent<T>) => void;
};

type Viewport<T extends HTMLElement> = {
  expanded: boolean;
  handlers: ViewportHandlers<T>;
};

function useViewport<T extends HTMLElement>(
  options: ViewportOptions
): Viewport<T> {
  const { presenter, holder, collapseDelay } = options;

  const [{ controller, viewport }] = React.useState(() => {
    const c = createViewportController({ collapseDelay });
    const v = createViewportHandlers<SyntheticEvent<T>, FocusEvent<T>>(c);

    return {
      controller: c,
      viewport: v,
    };
  });

  React.useEffect(
    function syncOptions() {
      controller.setOptions({ collapseDelay });
    },
    [controller, collapseDelay]
  );

  React.useEffect(
    function destroyController() {
      return () => controller.destroy();
    },
    [controller]
  );

  const expanded = React.useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    getServerSnapshot
  );

  React.useEffect(
    function listenOutside() {
      const { pointerdown, pointerover } = viewport.document;
      document.addEventListener('pointerdown', pointerdown);
      document.addEventListener('pointerover', pointerover);

      return () => {
        document.removeEventListener('pointerdown', pointerdown);
        document.removeEventListener('pointerover', pointerover);
      };
    },
    [viewport.document]
  );

  React.useEffect(
    function endHoverWhenEmpty() {
      return presenter.subscribe(() => {
        if (presenter.count() === 0) {
          controller.hover(false);
        }
      });
    },
    [presenter, controller]
  );

  React.useEffect(
    function holdWhileOpen() {
      if (!expanded || holder === undefined) {
        return;
      }

      return holder.hold(Symbol('viewport'));
    },
    [holder, expanded]
  );

  return {
    expanded,
    handlers: {
      onMouseEnter: viewport.element.mouseenter,
      onMouseMove: viewport.element.mousemove,
      onMouseLeave: viewport.element.mouseleave,
      onLostPointerCapture: viewport.element.lostpointercapture,
      onPointerDown: viewport.element.pointerdown,
      onPointerUp: viewport.element.pointerup,
      onPointerCancel: viewport.element.pointercancel,
      onFocus: viewport.element.focusin,
      onBlur: viewport.element.focusout,
    },
  };
}

export { useViewport };
export type { ViewportOptions, ViewportHandlers, Viewport };

// utils

const getServerSnapshot = () => false;
