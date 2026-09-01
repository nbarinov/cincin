import type { Presenter } from 'cincin/presenter';
import * as React from 'react';
import type { FocusEvent } from 'react';
import type { ToastContent } from './content';

type RegionOptions = {
  collapseDelay?: number;
};

function useRegion(
  presenter: Presenter<ToastContent>,
  options: RegionOptions = {}
) {
  const { collapseDelay = 200 } = options;
  const [expanded, setExpanded] = React.useState(false);
  const regionRef = React.useRef<HTMLOListElement | null>(null);
  const collapseTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const interacting = React.useRef(false);
  // Pointer capture (a real swipe) suppresses boundary events, so the
  // browser recomputes hover only on release: the gesture's mouseleave
  // lands AFTER pointerup, when `interacting` is already down, and
  // would collapse the stack the user is still cleaning up.
  // lostpointercapture marks the gesture's end ahead of that leave:
  // it arms a one-shot swallow, disarmed by the next enter/move
  // (a live pointer back inside the region).
  const swallowLeave = React.useRef(false);

  const expand = React.useCallback(() => {
    swallowLeave.current = false;
    clearTimeout(collapseTimer.current);
    setExpanded(true);
    presenter.pause();
  }, [presenter]);

  const collapse = React.useCallback(() => {
    if (interacting.current) {
      // Mid-gesture (a swipe drifting off the stack): stay expanded.
      return;
    }

    clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => {
      setExpanded(false);
      presenter.resume();
    }, collapseDelay);
  }, [presenter, collapseDelay]);

  React.useEffect(
    function subscribeRegionResets() {
      const onOutsidePointerDown = (event: PointerEvent) => {
        // iOS Safari emits emulated mouse events only for taps on
        // "clickable" targets: without this a tap on empty page space
        // would never collapse the stack.
        if (!regionRef.current?.contains(event.target as Node)) {
          collapse();
        }
      };
      document.addEventListener('pointerdown', onOutsidePointerDown);

      // An emptied region has nothing to hover: reset right away so the
      // next toast arrives into a fresh, unpaused stack.
      const unsubscribe = presenter.subscribe(() => {
        if (presenter.getSnapshot().length === 0) {
          clearTimeout(collapseTimer.current);
          setExpanded(false);
          presenter.resume();
        }
      });

      return () => {
        document.removeEventListener('pointerdown', onOutsidePointerDown);
        unsubscribe();
        clearTimeout(collapseTimer.current);
        // Unmounting an expanded region must not strand paused timers on
        // a shared toaster instance.
        presenter.resume();
      };
    },
    [presenter, collapse]
  );

  return {
    expanded,
    ref: regionRef,
    handlers: {
      // Hover rides MOUSE events: touch browsers emulate them, so a
      // tap expands and mouseleave arrives only from a tap outside.
      // mousemove re-arms after lost boundary events.
      onMouseEnter: expand,
      onMouseMove: expand,
      onMouseLeave: () => {
        if (swallowLeave.current) {
          swallowLeave.current = false;
          return;
        }

        collapse();
      },
      onLostPointerCapture: () => {
        swallowLeave.current = true;
      },
      // Focus mirrors hover for the keyboard: tabbing onto the front
      // card's controls opens the stack, and the collapsed backs (inert
      // until then) join the tab order.
      onFocus: expand,
      onBlur: (event: FocusEvent<HTMLOListElement>) => {
        if (event.currentTarget.contains(event.relatedTarget)) {
          return;
        }

        // A dismissed control drops focus to the body while the pointer
        // still parks on the stack: the hover keeps the region open.
        if (event.currentTarget.matches(':hover')) {
          return;
        }

        collapse();
      },
      onPointerDown: () => {
        interacting.current = true;
      },
      onPointerUp: () => {
        interacting.current = false;
      },
      onPointerCancel: () => {
        interacting.current = false;
      },
    },
  };
}

export { useRegion };
