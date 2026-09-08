import { createViewportController, createViewportHandlers } from 'cincin/dom';
import type { ViewportOptions } from 'cincin/dom';
import type { Presenter } from 'cincin/presenter';
import {
  onMounted,
  onScopeDispose,
  onUnmounted,
  toValue,
  watch,
  watchEffect,
} from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { useSnapshot } from '../shared/use-snapshot';

type ViewportHandlers = {
  mouseenter: (event: MouseEvent) => void;
  mousemove: (event: MouseEvent) => void;
  mouseleave: (event: MouseEvent) => void;
  lostpointercapture: (event: PointerEvent) => void;
  pointerdown: (event: PointerEvent) => void;
  pointerup: (event: PointerEvent) => void;
  pointercancel: (event: PointerEvent) => void;
  focusin: (event: FocusEvent) => void;
  focusout: (event: FocusEvent) => void;
};

type Viewport = {
  expanded: Readonly<Ref<boolean>>;
  handlers: ViewportHandlers;
};

function useViewport<Content extends {}>(
  presenter: Presenter<Content>,
  options?: MaybeRefOrGetter<ViewportOptions | undefined>
): Viewport {
  const controller = createViewportController(toValue(options));
  const viewport = createViewportHandlers(controller);

  onScopeDispose(() => controller.destroy());

  watchEffect(function syncOptions() {
    controller.setOptions(toValue(options) ?? {});
  });

  const expanded = useSnapshot(controller);

  let unsubscribeEmpty: (() => void) | undefined;

  onMounted(function listenOutside() {
    document.addEventListener('pointerdown', viewport.document.pointerdown);
    unsubscribeEmpty = presenter.subscribe(function endHoverWhenEmpty() {
      if (presenter.count() === 0) {
        controller.hover(false);
      }
    });
  });

  onUnmounted(() => {
    document.removeEventListener('pointerdown', viewport.document.pointerdown);
    unsubscribeEmpty?.();
    unsubscribeEmpty = undefined;
  });

  watch(
    expanded,
    function holdWhileOpen(open, _, onCleanup) {
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
    },
    { immediate: true }
  );

  return {
    expanded,
    handlers: {
      mouseenter: viewport.element.mouseenter,
      mousemove: viewport.element.mousemove,
      mouseleave: viewport.element.mouseleave,
      lostpointercapture: viewport.element.lostpointercapture,
      pointerdown: viewport.element.pointerdown,
      pointerup: viewport.element.pointerup,
      pointercancel: viewport.element.pointercancel,
      focusin: viewport.element.focusin,
      focusout: viewport.element.focusout,
    },
  };
}

export { useViewport };
export type { ViewportHandlers, Viewport };
