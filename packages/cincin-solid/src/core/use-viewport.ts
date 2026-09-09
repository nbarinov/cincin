import { createViewportController, createViewportHandlers } from 'cincin/dom';
import type { ViewportOptions as ControllerOptions } from 'cincin/dom';
import type { Presenter, PresenterHolder } from 'cincin/presenter';
import { createEffect, on, onCleanup, onMount } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { MaybeAccessor } from '../shared/maybe-accessor';
import { createSnapshotAccessor } from '../shared/snapshot-accessor';

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
  expanded: Accessor<boolean>;
  handlers: ViewportHandlers;
};

function useViewport(options: MaybeAccessor<ViewportOptions>): Viewport {
  const read = (): ViewportOptions =>
    typeof options === 'function' ? options() : options;
  const { presenter, holder } = read();
  const controller = createViewportController(read());
  const viewport = createViewportHandlers(controller);

  onCleanup(() => controller.destroy());

  createEffect(function syncOptions() {
    controller.setOptions(read());
  });

  const expanded = createSnapshotAccessor(controller);

  onMount(function listenOutside() {
    const { pointerdown, pointerover } = viewport.document;
    document.addEventListener('pointerdown', pointerdown);
    document.addEventListener('pointerover', pointerover);

    onCleanup(() => {
      document.removeEventListener('pointerdown', pointerdown);
      document.removeEventListener('pointerover', pointerover);
    });
  });

  onMount(function endHoverWhenEmpty() {
    onCleanup(
      presenter.subscribe(() => {
        if (presenter.count() === 0) {
          controller.hover(false);
        }
      })
    );
  });

  createEffect(
    on(expanded, function holdWhileOpen(open) {
      if (!open || holder === undefined) {
        return;
      }

      onCleanup(holder.hold(Symbol('viewport')));
    })
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
      onFocusIn: viewport.element.focusin,
      onFocusOut: viewport.element.focusout,
    },
  };
}

export { useViewport };
export type { ViewportOptions, ViewportHandlers, Viewport };
