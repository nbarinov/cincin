import type { SwipeDirection } from 'cincin/dom';

type ToasterPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

type ToasterAnchors = {
  x: 'left' | 'center' | 'right';
  y: 'top' | 'bottom';
};

/** The position's two halves, the way the skin anchors the list (`data-y`, `data-x`). */
function anchorsOf(position: ToasterPosition): ToasterAnchors {
  const [y, x] = position.split('-') as [
    ToasterAnchors['y'],
    ToasterAnchors['x'],
  ];

  return { x, y };
}

function outwardDirections(position: ToasterPosition): SwipeDirection[] {
  const { x, y } = anchorsOf(position);
  const edge: SwipeDirection = y === 'top' ? 'up' : 'down';

  return x === 'center' ? [edge] : [x, edge];
}

export { anchorsOf, outwardDirections };
export type { ToasterAnchors, ToasterPosition };
