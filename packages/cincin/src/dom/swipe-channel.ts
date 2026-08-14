import type { Axis, Sign } from './types';
import type { SwipeDirection } from './gesture';
import { AXIS, SIGN } from './gesture';
import { assignStyle, parseTranslate, translateValue } from './utils';

interface SwipeChannel {
  readonly element: HTMLElement;
  readonly axis: Axis;
  readonly sign: Sign;
  /** Writes the offset to the motion channel and the protocol variable. */
  set(px: number): void;
  /** Reads the current visual offset from the computed style. */
  read(): number;
  /** Signed off-screen target along the direction, with a shadow buffer. */
  exitTarget(): number;
  /** Returns every claimed channel to its pre-attach state. */
  release(): void;
}

function createSwipeChannel(
  element: HTMLElement,
  direction: SwipeDirection
): SwipeChannel {
  const axis = AXIS[direction];
  const sign = SIGN[direction];
  const variable = axis === 'x' ? '--cincin-swipe-x' : '--cincin-swipe-y';

  // Claim our channels up front: touch-action (the browser owns scrolling
  // on the other axis), the translate rest position, and the protocol
  // variable. One restore returns the element to its pre-attach state.
  const restore = assignStyle(element, {
    touchAction: axis === 'x' ? 'pan-y' : 'pan-x',
    translate: translateValue(axis, 0),
    [variable]: '0px',
  });

  return {
    element,
    axis,
    sign,
    set(px) {
      element.style.translate = translateValue(axis, px);
      element.style.setProperty(variable, `${px}px`);
    },
    read() {
      const [x, y] = parseTranslate(element);
      return axis === 'x' ? x : y;
    },
    exitTarget() {
      const container = element.parentElement;
      const size =
        axis === 'x'
          ? (container?.clientWidth ?? window.innerWidth)
          : (container?.clientHeight ?? window.innerHeight);

      // The buffer keeps shadows and blurs from lingering at the edge.
      return sign * (size + 40);
    },
    release: restore,
  };
}

export { createSwipeChannel };
export type { SwipeChannel };
