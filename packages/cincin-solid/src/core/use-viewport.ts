import { createViewportController, createViewportHandlers } from 'cincin/dom';
import type { ViewportOptions } from 'cincin/dom';
import type { Presenter } from 'cincin/presenter';
import { createEffect, on, onCleanup, onMount } from 'solid-js';
import type { Accessor } from 'solid-js';
import { access } from '../shared/maybe-accessor';
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

type Viewport = {
  expanded: Accessor<boolean>;
  handlers: ViewportHandlers;
};

function useViewport<Content extends {}>(
  presenter: Presenter<Content>,
  options?: MaybeAccessor<ViewportOptions | undefined>
): Viewport {
  const controller = createViewportController(access(options));
  const viewport = createViewportHandlers(controller);

  onCleanup(() => controller.destroy());

  createEffect(function syncOptions() {
    controller.setOptions(access(options) ?? {});
  });

  const expanded = createSnapshotAccessor(controller);

  onMount(function listenOutside() {
    document.addEventListener('pointerdown', viewport.document.pointerdown);

    onCleanup(() =>
      document.removeEventListener('pointerdown', viewport.document.pointerdown)
    );
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
      if (!open) {
        return;
      }

      presenter.pause();
      const unsubscribe = presenter.subscribe((event) => {
        if (event.type === 'entered') {
          presenter.pause(event.toast.key);
        }
      });

      onCleanup(() => {
        unsubscribe();
        presenter.resume();
      });
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
export type { ViewportHandlers, Viewport };
