import type { Presenter } from 'cincin/presenter';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastContent } from './content';

type RegionOptions = {
  collapseDelay?: number;
};

function useRegion(
  presenter: Presenter<ToastContent>,
  options: RegionOptions = {}
) {
  const { collapseDelay = 200 } = options;
  const [expanded, setExpanded] = useState(false);
  const regionRef = useRef<HTMLOListElement | null>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const interacting = useRef(false);

  const expand = useCallback(() => {
    clearTimeout(collapseTimer.current);
    setExpanded(true);
    presenter.pause();
  }, [presenter]);

  const collapse = useCallback(() => {
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

  useEffect(
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
      // Hover rides MOUSE events, sonner-style: touch browsers emulate
      // them, so a tap expands and mouseleave arrives only from a tap
      // outside. mousemove re-arms after lost boundary events.
      onMouseEnter: expand,
      onMouseMove: expand,
      onMouseLeave: collapse,
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
