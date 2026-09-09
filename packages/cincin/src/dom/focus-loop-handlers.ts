import type { FocusLoopController } from './focus-loop-controller';
import { createPointerGesture } from './pointer-gesture';

type FocusInEventLike = Pick<
  FocusEvent,
  'target' | 'currentTarget' | 'relatedTarget'
>;

type FocusOutEventLike = Pick<FocusEvent, 'currentTarget' | 'relatedTarget'>;

type KeyEventLike = Pick<KeyboardEvent, 'key'>;

type FocusLoopHandlers<
  I extends FocusInEventLike = FocusEvent,
  O extends FocusOutEventLike = FocusEvent,
  K extends KeyEventLike = KeyboardEvent,
> = {
  element: {
    focusin(event: I): void;
    focusout(event: O): void;
    keydown(event: K): void;
    pointerdown(): void;
    pointerup(): void;
    pointercancel(): void;
  };
};

/**
 * The event-to-fact translator, shared by the adapters. Decides here
 * whether a focus move crossed the stack's edge and whether a pointer
 * placed the focus (the pointer events bubble up from the list), so
 * the machine never touches an event; which card holds the node is
 * the layout's question.
 */
function createFocusLoopHandlers<
  I extends FocusInEventLike = FocusEvent,
  O extends FocusOutEventLike = FocusEvent,
  K extends KeyEventLike = KeyboardEvent,
>(controller: FocusLoopController): FocusLoopHandlers<I, O, K> {
  const pointer = createPointerGesture();

  return {
    element: {
      focusin(event) {
        const target = event.target instanceof Element ? event.target : null;
        const from = event.relatedTarget;

        controller.enter({
          origin:
            from instanceof HTMLElement && isOutside(event, from) ? from : null,
          target,
          keyboard: !pointer.active(),
        });
      },
      focusout(event) {
        const to = event.relatedTarget;

        if (to instanceof Node && isOutside(event, to)) {
          controller.exit();
        }
      },
      keydown(event) {
        if (event.key === 'Escape') {
          controller.escape();
        }
      },
      pointerdown: pointer.pointerdown,
      pointerup: pointer.pointerup,
      pointercancel: pointer.pointercancel,
    },
  };
}

export { createFocusLoopHandlers };
export type {
  FocusLoopHandlers,
  FocusInEventLike,
  FocusOutEventLike,
  KeyEventLike,
};

// utils

function isOutside(event: Pick<Event, 'currentTarget'>, node: Node): boolean {
  return (
    event.currentTarget instanceof Node && !event.currentTarget.contains(node)
  );
}
