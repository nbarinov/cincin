import type { Axis, Sign } from './types';
import type { SwipeDirection } from './gesture';
import { AXIS } from './gesture';
import { assignStyle, parseTranslate } from './utils';

interface SwipeChannel {
  readonly element: HTMLElement;
  /**
   * Pins the current visual offset as the inline value and returns
   * both components: the next gesture's axis is not known yet.
   */
  pin(): [x: number, y: number];
  /**
   * Writes the offset along the axis to the motion channel and
   * the protocol variables. The other component is forfeited to zero:
   * a single axis moves at a time, and a cross-axis re-grab drops
   * the orphaned remainder of the spring it caught (bounded by how
   * little of that spring was left).
   */
  set(axis: Axis, px: number): void;
  /**
   * Signed translate that puts the card fully past the viewport edge
   * along the axis, with a shadow buffer. `from` is the current drag
   * offset: the visual rect carries it, and the target is measured
   * against the resting box behind it.
   */
  exitTarget(axis: Axis, sign: Sign, from: number): number;
  /**
   * Toggles the grabbed state for skins ([data-swiping]).
   */
  markSwiping(active: boolean): void;
  /**
   * Enters the departure phase ([data-swipe-direction]) with the
   * actual travel, decided at release. One-way.
   */
  markExit(direction: SwipeDirection): void;
  /**
   * True once the departure phase started: a dead toast is not grabbable.
   */
  exiting(): boolean;
  /**
   * Returns every claimed channel to its pre-attach state.
   */
  release(): void;
}

function createSwipeChannel(
  element: HTMLElement,
  directions: readonly SwipeDirection[]
): SwipeChannel {
  const axes = new Set(directions.map((direction) => AXIS[direction]));

  // Claim our channels up front: the translate rest position and the
  // protocol variable of every allowed axis. One restore returns the
  // element to its pre-bind state.
  const claims: Parameters<typeof assignStyle>[1] = { translate: '0px 0px' };
  for (const axis of axes) {
    claims[VARIABLE[axis]] = '0px';
  }
  const restore = assignStyle(element, claims);

  const write = (x: number, y: number): void => {
    element.style.translate = `${x}px ${y}px`;

    if (axes.has('x')) {
      element.style.setProperty(VARIABLE.x, `${x}px`);
    }

    if (axes.has('y')) {
      element.style.setProperty(VARIABLE.y, `${y}px`);
    }
  };

  return {
    element,
    pin() {
      const [x, y] = parseTranslate(element);
      write(x, y);
      return [x, y];
    },
    set(axis, px) {
      write(axis === 'x' ? px : 0, axis === 'y' ? px : 0);
    },
    exitTarget(axis, sign, from) {
      const rect = element.getBoundingClientRect();
      const box =
        axis === 'x'
          ? { start: rect.left, end: rect.right, viewport: window.innerWidth }
          : { start: rect.top, end: rect.bottom, viewport: window.innerHeight };

      const travel =
        sign === 1 ? box.viewport - (box.start - from) : box.end - from;

      return sign * (travel + BUFFER);
    },
    markSwiping(active) {
      if (active) {
        element.setAttribute('data-swiping', 'true');
      } else {
        element.removeAttribute('data-swiping');
      }
    },
    markExit(direction) {
      element.setAttribute('data-swipe-direction', direction);
    },
    exiting() {
      return element.hasAttribute('data-swipe-direction');
    },
    release() {
      restore();

      element.removeAttribute('data-swiping');
      // data-swipe-direction stays: the departure phase is one-way and
      // the protocol signal must survive a detach during the fling.
    },
  };
}

const VARIABLE = {
  x: '--cincin-swipe-x',
  y: '--cincin-swipe-y',
} as const;

const BUFFER = 40;

export { createSwipeChannel };
export type { SwipeChannel };
