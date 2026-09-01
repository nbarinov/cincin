import type { Presenter } from 'cincin/presenter';
import { createSignal, onCleanup, onMount } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { ToastContent } from './content';

type RegionOptions = {
  collapseDelay?: number;
};

function useRegion(
  element: Accessor<HTMLElement | undefined>,
  presenter: Presenter<ToastContent>,
  options: RegionOptions = {}
) {
  const { collapseDelay = 200 } = options;
  const [expanded, setExpanded] = createSignal(false);
  let collapseTimer: ReturnType<typeof setTimeout> | undefined;
  let interacting = false;

  function expand(): void {
    clearTimeout(collapseTimer);
    setExpanded(true);
    presenter.pause();
  }

  function collapse(): void {
    if (interacting) {
      // Mid-gesture (a swipe drifting off the stack): stay expanded.
      return;
    }

    clearTimeout(collapseTimer);
    collapseTimer = setTimeout(() => {
      setExpanded(false);
      presenter.resume();
    }, collapseDelay);
  }

  onMount(() => {
    const onOutsidePointerDown = (event: PointerEvent) => {
      // iOS Safari emits emulated mouse events only for taps on
      // "clickable" targets: without this a tap on empty page space
      // would never collapse the stack.
      const region = element();

      if (region !== undefined && !region.contains(event.target as Node)) {
        collapse();
      }
    };
    document.addEventListener('pointerdown', onOutsidePointerDown);

    // An emptied region has nothing to hover: reset right away so the
    // next toast arrives into a fresh, unpaused stack.
    const unsubscribe = presenter.subscribe(() => {
      if (presenter.getSnapshot().length === 0) {
        clearTimeout(collapseTimer);
        setExpanded(false);
        presenter.resume();
      }
    });

    onCleanup(() => {
      document.removeEventListener('pointerdown', onOutsidePointerDown);
      unsubscribe();
      clearTimeout(collapseTimer);
      // Unmounting an expanded region must not strand paused timers on
      // a shared toaster instance.
      presenter.resume();
    });
  });

  return {
    expanded,
    handlers: {
      // Hover rides MOUSE events: touch browsers emulate them, so a
      // tap expands and mouseleave arrives only from a tap outside.
      // mousemove re-arms after lost boundary events.
      onMouseEnter: expand,
      onMouseMove: expand,
      onMouseLeave: collapse,
      // Focus mirrors hover for the keyboard, riding the bubbling
      // focusin/focusout pair (focus itself does not bubble): tabbing
      // onto the front card's controls opens the stack, and the
      // collapsed backs (inert until then) join the tab order.
      onFocusIn: expand,
      onFocusOut: (event: FocusEvent) => {
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
      onPointerDown: () => {
        interacting = true;
      },
      onPointerUp: () => {
        interacting = false;
      },
      onPointerCancel: () => {
        interacting = false;
      },
    },
  };
}

export { useRegion };
