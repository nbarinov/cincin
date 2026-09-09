import type { Presenter, PresenterHolder } from 'cincin/presenter';
import { createViewportController, createViewportHandlers } from 'cincin/dom';
import type { ViewportOptions as ControllerOptions } from 'cincin/dom';
import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import { useSyncExternalStore } from '../shared/use-sync-external-store';

type ViewportHandlers = {
  onMouseEnter: (event: MouseEvent) => void;
  onMouseMove: (event: MouseEvent) => void;
  onMouseLeave: (event: MouseEvent) => void;
  onLostPointerCapture: (event: PointerEvent) => void;
  onPointerDown: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onPointerCancel: (event: PointerEvent) => void;
  onFocusIn: (event: FocusEvent) => void;
  onFocusOut: (event: FocusEvent) => void;
};

type ViewportOptions = ControllerOptions & {
  presenter: Presenter<{}>;
  holder?: PresenterHolder;
};

type Viewport = {
  expanded: boolean;
  handlers: ViewportHandlers;
};

function useViewport(options: ViewportOptions): Viewport {
  const { presenter, holder, collapseDelay } = options;

  const [{ controller, viewport }] = useState(() => {
    const c = createViewportController({ collapseDelay });
    const v = createViewportHandlers(c);

    return {
      controller: c,
      viewport: v,
    };
  });

  useEffect(
    function syncOptions() {
      controller.setOptions({ collapseDelay });
    },
    [controller, collapseDelay]
  );

  useEffect(
    function destroyController() {
      return () => controller.destroy();
    },
    [controller]
  );

  const expanded = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    getServerSnapshot
  );

  useEffect(
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

  useEffect(
    function endHoverWhenEmpty() {
      return presenter.subscribe(() => {
        if (presenter.count() === 0) {
          controller.hover(false);
        }
      });
    },
    [presenter, controller]
  );

  // Before paint, as the store bridge subscribes:
  // Preact runs passive effects a frame later,
  // and a clock must not tick under an open stack for that frame.
  useLayoutEffect(
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
      // Native focus does not bubble, so the viewport listens to the focusin/focusout pair.
      onFocusIn: viewport.element.focusin,
      onFocusOut: viewport.element.focusout,
    },
  };
}

export { useViewport };
export type { ViewportOptions, ViewportHandlers, Viewport };

// utils

const getServerSnapshot = () => false;
