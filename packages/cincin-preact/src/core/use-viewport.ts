import type { Presenter } from 'cincin/presenter';
import { createViewportController, createViewportHandlers } from 'cincin/dom';
import type { ViewportOptions } from 'cincin/dom';
import { useEffect, useState } from 'preact/hooks';
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

type Viewport = {
  expanded: boolean;
  handlers: ViewportHandlers;
};

function useViewport<Content extends {}>(
  presenter: Presenter<Content>,
  options: ViewportOptions = {}
): Viewport {
  const { collapseDelay } = options;

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
      document.addEventListener('pointerdown', viewport.document.pointerdown);

      return () =>
        document.removeEventListener(
          'pointerdown',
          viewport.document.pointerdown
        );
    },
    [viewport.document.pointerdown]
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

  useEffect(
    function holdWhileOpen() {
      if (!expanded) {
        return;
      }

      presenter.pause();
      const unsubscribe = presenter.subscribe((event) => {
        if (event.type === 'entered') {
          presenter.pause(event.toast.key);
        }
      });

      return () => {
        unsubscribe();
        presenter.resume();
      };
    },
    [presenter, expanded]
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
export type { ViewportHandlers, Viewport };

// utils

const getServerSnapshot = () => false;
