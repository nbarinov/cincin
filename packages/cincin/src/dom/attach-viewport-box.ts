import type { StackLayout } from './stack-layout';
import { assignStyle } from './utils';

/**
 * Sizes the viewport element to the stack's footprint through the CSS
 * protocol: `--cincin-stack-height` for the expanded stack,
 * `--cincin-stack-front-height` and `--cincin-stack-backs` for the
 * collapsed one. The values are plain numbers of pixels, not lengths:
 * the skin turns them into a `scaleY` on a hit box, because a box that
 * changes its layout height would count as a layout shift, while a
 * transform does not. The hit box keeps the pointer inside the stack
 * across the gaps between cards, an inert leaving ghost and the peeking
 * backs. Detaching restores the element's own values.
 */
function attachViewportBox(
  element: HTMLElement,
  layout: StackLayout
): () => void {
  // Claim the three channels up front: one restore returns the element
  // to its pre-attach state, a consumer's own values included.
  const restore = assignStyle(element, {
    '--cincin-stack-height': '0',
    '--cincin-stack-front-height': '0',
    '--cincin-stack-backs': '0',
  });

  const write = () => {
    const box = layout.getBox();
    element.style.setProperty('--cincin-stack-height', String(box.height));
    element.style.setProperty(
      '--cincin-stack-front-height',
      String(box.frontHeight ?? 0)
    );
    element.style.setProperty('--cincin-stack-backs', String(box.backs));
  };

  write();
  const unsubscribe = layout.subscribe(write);

  return () => {
    unsubscribe();
    restore();
  };
}

export { attachViewportBox };
