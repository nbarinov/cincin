import { createFocusLoopController } from './focus-loop-controller';
import type { FocusLoopController } from './focus-loop-controller';
import { createFocusLoopHandlers } from './focus-loop-handlers';
import type {
  FocusInEventLike,
  FocusOutEventLike,
  KeyEventLike,
} from './focus-loop-handlers';
import { createStackLayout } from './stack-layout';

/** A stack with one card holding a control, plus a control outside. */
function makeStack() {
  const stack = document.createElement('ol');
  const card = document.createElement('li');
  const control = document.createElement('button');
  card.append(control);
  stack.append(card);
  const outside = document.createElement('button');
  document.body.append(stack, outside);
  return { stack, card, control, outside };
}

function spied(): FocusLoopController {
  const loop = createFocusLoopController(createStackLayout());
  vi.spyOn(loop, 'enter');
  vi.spyOn(loop, 'exit');
  vi.spyOn(loop, 'escape');
  return loop;
}

function handlersFor(loop: FocusLoopController) {
  return createFocusLoopHandlers<
    FocusInEventLike,
    FocusOutEventLike,
    KeyEventLike
  >(loop);
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('createFocusLoopHandlers', () => {
  it('should report an entry from outside with its origin and target', () => {
    const loop = spied();
    const { element } = handlersFor(loop);
    const { stack, control, outside } = makeStack();

    element.focusin({
      currentTarget: stack,
      target: control,
      relatedTarget: outside,
    });

    expect(loop.enter).toHaveBeenCalledWith({
      origin: outside,
      target: control,
      keyboard: expect.any(Boolean),
    });
  });

  it('should report a move within the stack without an origin', () => {
    const loop = spied();
    const { element } = handlersFor(loop);
    const { stack, card, control } = makeStack();

    element.focusin({
      currentTarget: stack,
      target: control,
      relatedTarget: card,
    });
    element.focusin({
      currentTarget: stack,
      target: card,
      relatedTarget: null,
    });

    expect(loop.enter).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ origin: null, target: control })
    );
    expect(loop.enter).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ origin: null, target: card })
    );
  });

  it('should read a focus the pointer placed as not keyboard-driven', () => {
    vi.useFakeTimers();
    const loop = spied();
    const { element } = handlersFor(loop);
    const { stack, card, outside } = makeStack();
    const enter = {
      currentTarget: stack,
      target: card,
      relatedTarget: outside,
    };

    element.pointerdown();
    element.focusin(enter);
    element.pointerup();
    expect(loop.enter).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyboard: false })
    );

    vi.runAllTimers();
    element.focusin(enter);
    expect(loop.enter).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyboard: true })
    );
    vi.useRealTimers();
  });

  it('should report an exit only for focus that left the stack', () => {
    const loop = spied();
    const { element } = handlersFor(loop);
    const { stack, card, outside } = makeStack();

    element.focusout({ currentTarget: stack, relatedTarget: card });
    element.focusout({ currentTarget: stack, relatedTarget: null });
    expect(loop.exit).not.toHaveBeenCalled();

    element.focusout({ currentTarget: stack, relatedTarget: outside });
    expect(loop.exit).toHaveBeenCalledTimes(1);
  });

  it('should translate Escape and nothing else', () => {
    const loop = spied();
    const { element } = handlersFor(loop);

    element.keydown({ key: 'Enter' });
    element.keydown({ key: 'Tab' });
    expect(loop.escape).not.toHaveBeenCalled();

    element.keydown({ key: 'Escape' });
    expect(loop.escape).toHaveBeenCalledTimes(1);
  });
});
