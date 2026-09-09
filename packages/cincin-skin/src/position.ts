import type { SwipeDirection } from 'cincin/dom';

type ToasterPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

function outwardDirections(position: ToasterPosition): SwipeDirection[] {
  const [y, x] = split(position);
  const edge: SwipeDirection = y === 'top' ? 'up' : 'down';

  return x === 'center' ? [edge] : [x, edge];
}

export { outwardDirections };
export type { ToasterPosition };

// utils

function split(
  position: ToasterPosition
): [y: 'top' | 'bottom', x: 'left' | 'center' | 'right'] {
  return position.split('-') as ReturnType<typeof split>;
}
