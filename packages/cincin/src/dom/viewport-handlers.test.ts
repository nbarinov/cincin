import { createViewportController } from './viewport-controller';
import type { ViewportController } from './viewport-controller';
import { createViewportHandlers } from './viewport-handlers';
import type { ElementEventLike, FocusEventLike } from './viewport-handlers';

function spied(): ViewportController {
  const viewport = createViewportController();
  vi.spyOn(viewport, 'hover');
  vi.spyOn(viewport, 'focus');
  vi.spyOn(viewport, 'interact');
  return viewport;
}

function handlersFor(viewport: ViewportController) {
  return createViewportHandlers<ElementEventLike, FocusEventLike>(viewport);
}

/** A stack with one control inside, plus one outside. */
function makeStack() {
  const stack = document.createElement('ol');
  const inside = document.createElement('button');
  stack.append(inside);
  const outside = document.createElement('button');
  document.body.append(stack, outside);
  return { stack, inside, outside };
}

const at = (currentTarget: EventTarget): ElementEventLike => ({
  currentTarget,
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('createViewportHandlers', () => {
  it('should translate the pointer presence into hover', () => {
    const viewport = spied();
    const { element } = handlersFor(viewport);
    const { stack } = makeStack();

    element.mouseenter(at(stack));
    expect(viewport.hover).toHaveBeenLastCalledWith(true);
    element.mousemove(at(stack));
    expect(viewport.hover).toHaveBeenLastCalledWith(true);
    element.mouseleave(at(stack));
    expect(viewport.hover).toHaveBeenLastCalledWith(false);
  });

  it('should swallow exactly one mouseleave after a lost pointer capture', () => {
    // A swipe's capture suppresses boundary events, so the browser
    // recomputes hover only on release: the gesture's mouseleave lands
    // after pointerup and would fold the stack the user still holds.
    const viewport = spied();
    const { element } = handlersFor(viewport);
    const { stack } = makeStack();

    element.mouseenter(at(stack));
    element.lostpointercapture(at(stack));
    element.mouseleave(at(stack));
    expect(viewport.hover).not.toHaveBeenCalledWith(false);

    element.mouseleave(at(stack));
    expect(viewport.hover).toHaveBeenLastCalledWith(false);
  });

  it('should disarm the swallow when the pointer is seen inside again', () => {
    const viewport = spied();
    const { element } = handlersFor(viewport);
    const { stack } = makeStack();

    element.lostpointercapture(at(stack));
    element.mousemove(at(stack));
    element.mouseleave(at(stack));

    expect(viewport.hover).toHaveBeenLastCalledWith(false);
  });

  it('should translate the pointer contact into interact', () => {
    const viewport = spied();
    const { element } = handlersFor(viewport);
    const { stack } = makeStack();

    element.pointerdown(at(stack));
    expect(viewport.interact).toHaveBeenLastCalledWith(true);
    element.pointerup(at(stack));
    expect(viewport.interact).toHaveBeenLastCalledWith(false);
    element.pointerdown(at(stack));
    element.pointercancel(at(stack));
    expect(viewport.interact).toHaveBeenLastCalledWith(false);
  });

  it('should read a focus the pointer placed as no attention', () => {
    vi.useFakeTimers();
    const viewport = spied();
    const { element } = handlersFor(viewport);
    const { stack } = makeStack();

    // A mouse focuses on mousedown, between pointerdown and pointerup.
    element.pointerdown(at(stack));
    element.focusin(at(stack));
    element.pointerup(at(stack));
    expect(viewport.focus).toHaveBeenLastCalledWith(false);

    // Touch focuses through the compatibility mousedown after pointerup.
    element.pointerdown(at(stack));
    element.pointerup(at(stack));
    element.focusin(at(stack));
    expect(viewport.focus).toHaveBeenLastCalledWith(false);

    vi.runAllTimers();
    element.focusin(at(stack));
    expect(viewport.focus).toHaveBeenLastCalledWith(true);
    vi.useRealTimers();
  });

  it('should translate focus entering into focus', () => {
    const viewport = spied();
    const { element } = handlersFor(viewport);
    const { stack } = makeStack();

    element.focusin(at(stack));
    expect(viewport.focus).toHaveBeenLastCalledWith(true);
  });

  it('should ignore a focusout that only moved focus within the stack', () => {
    const viewport = spied();
    const { element } = handlersFor(viewport);
    const { stack, inside, outside } = makeStack();

    element.focusout({ currentTarget: stack, relatedTarget: inside });
    expect(viewport.focus).not.toHaveBeenCalled();

    element.focusout({ currentTarget: stack, relatedTarget: null });
    expect(viewport.focus).toHaveBeenLastCalledWith(false);

    element.focusout({ currentTarget: stack, relatedTarget: outside });
    expect(viewport.focus).toHaveBeenCalledTimes(2);
  });

  it('should end the hover on a document pointerdown outside the stack', () => {
    const viewport = spied();
    const { element, document: outsideHandlers } = handlersFor(viewport);
    const { stack, outside } = makeStack();

    element.mouseenter(at(stack));
    outsideHandlers.pointerdown({ target: outside });
    expect(viewport.hover).toHaveBeenLastCalledWith(false);
  });

  it('should keep the hover on a document pointerdown inside the stack', () => {
    const viewport = spied();
    const { element, document: outsideHandlers } = handlersFor(viewport);
    const { stack, inside } = makeStack();

    element.mouseenter(at(stack));
    outsideHandlers.pointerdown({ target: inside });
    expect(viewport.hover).not.toHaveBeenCalledWith(false);
  });

  it('should end the hover when the pointer is seen over something outside', () => {
    const viewport = spied();
    const { element, document: outside } = handlersFor(viewport);
    const { stack, inside } = makeStack();

    element.mouseenter(at(stack));
    outside.pointerover({ target: inside });
    expect(viewport.hover).not.toHaveBeenCalledWith(false);

    outside.pointerover({ target: document.body });
    expect(viewport.hover).toHaveBeenLastCalledWith(false);
  });

  it('should treat every pointerdown as outside before the element is known', () => {
    // Harmless: the stack cannot be open before an element event, and
    // a hover end on a folded stack is ignored by the machine.
    const viewport = spied();
    const { document: outsideHandlers } = handlersFor(viewport);
    const { inside } = makeStack();

    outsideHandlers.pointerdown({ target: inside });
    expect(viewport.hover).toHaveBeenLastCalledWith(false);
  });
});
