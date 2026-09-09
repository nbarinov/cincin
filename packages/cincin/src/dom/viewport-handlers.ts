import { createPointerGesture } from './pointer-gesture';
import type { ViewportController } from './viewport-controller';

type ElementEventLike = Pick<Event, 'currentTarget'>;

type FocusEventLike = ElementEventLike & Pick<FocusEvent, 'relatedTarget'>;

type TargetEventLike = Pick<Event, 'target'>;

type ViewportHandlers<
  E extends ElementEventLike = Event,
  F extends FocusEventLike = FocusEvent,
> = {
  element: {
    mouseenter(event: E): void;
    mousemove(event: E): void;
    mouseleave(event: E): void;
    lostpointercapture(event: E): void;
    pointerdown(event: E): void;
    pointerup(event: E): void;
    pointercancel(event: E): void;
    focusin(event: E): void;
    focusout(event: F): void;
  };
  document: {
    /**
     * A pointerdown outside the stack ends the hover:
     * iOS Safari sends no mouseleave for a tap on empty page space.
     */
    pointerdown(event: TargetEventLike): void;
    /**
     * A pointerover outside the stack ends the hover too: Chromium
     * drops the boundary events when the node under the pointer was
     * removed (an action rewriting its toast takes its button away),
     * and the mouseleave never comes; the entry into whatever is
     * outside still does.
     */
    pointerover(event: TargetEventLike): void;
  };
};

/**
 * The event-to-attention translator, shared by the adapters.
 * The quirks of event plumbing live here, not in the machine:
 * the mouseleave a swipe's pointer capture delays past pointerup
 * (armed by lostpointercapture, one-shot, disarmed by the next enter or move),
 * the focusout that only moved focus within the stack,
 * the focusin a pointer placed (attention is keyboard focus: a focus
 * that came with a click adds nothing to the hover it came with, and
 * it ends whatever keyboard attention was inside), and
 * the document pointerdown or pointerover that was on the stack after all.
 * The element is learned from the events themselves
 * (the stack can only open through one of them),
 * so the translator binds to nothing.
 */
function createViewportHandlers<
  E extends ElementEventLike = Event,
  F extends FocusEventLike = FocusEvent,
>(controller: ViewportController): ViewportHandlers<E, F> {
  const pointer = createPointerGesture();
  let element: Node | null = null;
  let swallowLeave = false;

  const bind = (event: ElementEventLike): void => {
    if (event.currentTarget instanceof Node) {
      element = event.currentTarget;
    }
  };

  const outside = (event: TargetEventLike): void => {
    if (
      event.target instanceof Node &&
      element !== null &&
      element.contains(event.target)
    ) {
      return;
    }

    controller.hover(false);
  };

  return {
    element: {
      mouseenter(event) {
        bind(event);
        swallowLeave = false;
        controller.hover(true);
      },
      // mousemove re-arms after lost boundary events:
      // a card removed from under the pointer takes its mouseleave with it.
      mousemove(event) {
        bind(event);
        swallowLeave = false;
        controller.hover(true);
      },
      mouseleave(event) {
        bind(event);

        if (swallowLeave) {
          swallowLeave = false;
          return;
        }

        controller.hover(false);
      },
      lostpointercapture(event) {
        bind(event);
        swallowLeave = true;
      },
      pointerdown(event) {
        bind(event);
        pointer.pointerdown();
        controller.interact(true);
      },
      pointerup(event) {
        bind(event);
        pointer.pointerup();
        controller.interact(false);
      },
      pointercancel(event) {
        bind(event);
        pointer.pointercancel();
        controller.interact(false);
      },
      focusin(event) {
        bind(event);
        controller.focus(!pointer.active());
      },
      focusout(event) {
        bind(event);

        if (
          event.relatedTarget instanceof Node &&
          element !== null &&
          element.contains(event.relatedTarget)
        ) {
          return;
        }

        controller.focus(false);
      },
    },
    document: {
      pointerdown: outside,
      pointerover: outside,
    },
  };
}

export { createViewportHandlers };
export type {
  ViewportHandlers,
  ElementEventLike,
  FocusEventLike,
  TargetEventLike,
};
