import type { SwipeDirection } from 'cincin/dom';

/** The skin's corner (or edge center) for the toast region. */
type ToasterPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * The outward edges of a position: the natural `directions` default
 * for a swipe, `f(position)`. A corner offers its two edges; a center
 * offers only its vertical one — neither horizontal edge is near, and
 * a flight across half the viewport reads as dragging, not dismissal.
 */
function outwardDirections(position: ToasterPosition): SwipeDirection[] {
  const [y, x] = split(position);
  const edge: SwipeDirection = y === 'top' ? 'up' : 'down';

  return x === 'center' ? [edge] : [x, edge];
}

function split(
  position: ToasterPosition
): [y: 'top' | 'bottom', x: 'left' | 'center' | 'right'] {
  return position.split('-') as ReturnType<typeof split>;
}

export { outwardDirections };
export type { ToasterPosition };
