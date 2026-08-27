import type { Presenter } from 'cincin/presenter';
import { onMounted, onUnmounted, shallowRef, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type { ToastContent } from './content';

type RegionOptions = {
  collapseDelay?: number;
};

function useRegion(
  element: MaybeRefOrGetter<HTMLElement | null>,
  presenter: Presenter<ToastContent>,
  options: RegionOptions = {}
) {
  const { collapseDelay = 200 } = options;
  const expanded = shallowRef(false);
  let collapseTimer: ReturnType<typeof setTimeout> | undefined;
  let interacting = false;

  function expand(): void {
    clearTimeout(collapseTimer);
    expanded.value = true;
    presenter.pause();
  }

  function collapse(): void {
    if (interacting) {
      // Mid-gesture (a swipe drifting off the stack): stay expanded.
      return;
    }

    clearTimeout(collapseTimer);
    collapseTimer = setTimeout(() => {
      expanded.value = false;
      presenter.resume();
    }, collapseDelay);
  }

  let teardown: (() => void) | undefined;

  onMounted(() => {
    const onOutsidePointerDown = (event: PointerEvent) => {
      // iOS Safari emits emulated mouse events only for taps on
      // "clickable" targets: without this a tap on empty page space
      // would never collapse the stack.
      const region = toValue(element);

      if (region !== null && !region.contains(event.target as Node)) {
        collapse();
      }
    };
    document.addEventListener('pointerdown', onOutsidePointerDown);

    // An emptied region has nothing to hover: reset right away so the
    // next toast arrives into a fresh, unpaused stack.
    const unsubscribe = presenter.subscribe(() => {
      if (presenter.getSnapshot().length === 0) {
        clearTimeout(collapseTimer);
        expanded.value = false;
        presenter.resume();
      }
    });

    teardown = () => {
      document.removeEventListener('pointerdown', onOutsidePointerDown);
      unsubscribe();
      clearTimeout(collapseTimer);
      // Unmounting an expanded region must not strand paused timers on
      // a shared toaster instance.
      presenter.resume();
    };
  });

  onUnmounted(() => {
    teardown?.();
    teardown = undefined;
  });

  return {
    expanded,
    handlers: {
      // Hover rides MOUSE events: touch browsers emulate them, so a
      // tap expands and mouseleave arrives only from a tap outside.
      // mousemove re-arms after lost boundary events.
      onMouseenter: expand,
      onMousemove: expand,
      onMouseleave: collapse,
      // Focus mirrors hover for the keyboard, riding the bubbling
      // focusin/focusout pair (focus itself does not bubble): tabbing
      // onto the front card's controls opens the stack, and the
      // collapsed backs (inert until then) join the tab order.
      onFocusin: expand,
      onFocusout: (event: FocusEvent) => {
        const region = event.currentTarget as HTMLElement;

        if (region.contains(event.relatedTarget as Node | null)) {
          return;
        }

        // A dismissed control drops focus to the body while the pointer
        // still parks on the stack: the hover keeps the region open.
        if (region.matches(':hover')) {
          return;
        }

        collapse();
      },
      onPointerdown: () => {
        interacting = true;
      },
      onPointerup: () => {
        interacting = false;
      },
      onPointercancel: () => {
        interacting = false;
      },
    },
  };
}

export { useRegion };
