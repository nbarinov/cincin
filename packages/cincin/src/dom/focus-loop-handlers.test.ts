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

  it('should read the focus modality off the focused node', () => {
    const loop = spied();
    const { element } = handlersFor(loop);
    const { stack, card, outside } = makeStack();
    const matches = vi.spyOn(card, 'matches').mockReturnValue(true);

    element.focusin({
      currentTarget: stack,
      target: card,
      relatedTarget: outside,
    });

    expect(matches).toHaveBeenCalledWith(':focus-visible');
    expect(loop.enter).toHaveBeenCalledWith(
      expect.objectContaining({ keyboard: true })
    );
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
