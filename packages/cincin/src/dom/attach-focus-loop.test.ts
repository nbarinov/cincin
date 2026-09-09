import { attachFocusLoop } from './attach-focus-loop';
import { createFocusLoopController } from './focus-loop-controller';
import type { FocusLoopController } from './focus-loop-controller';
import { createStackLayout } from './stack-layout';

function spied(): FocusLoopController {
  const loop = createFocusLoopController(createStackLayout());
  vi.spyOn(loop, 'enter');
  vi.spyOn(loop, 'exit');
  vi.spyOn(loop, 'escape');
  return loop;
}

function makeStack() {
  const stack = document.createElement('ol');
  const card = document.createElement('li');
  card.tabIndex = 0;
  stack.append(card);
  const outside = document.createElement('button');
  document.body.append(stack, outside);
  return { stack, card, outside };
}

function press(key: string, target: EventTarget): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  );
}

const detachers: Array<() => void> = [];

function attach(
  ...args: Parameters<typeof attachFocusLoop>
): ReturnType<typeof attachFocusLoop> {
  const detach = attachFocusLoop(...args);
  detachers.push(detach);
  return detach;
}

afterEach(() => {
  while (detachers.length > 0) {
    detachers.pop()!();
  }
  document.body.innerHTML = '';
});

describe('attachFocusLoop', () => {
  it('should drive the machine from native focus and key events', () => {
    const loop = spied();
    const { stack, card, outside } = makeStack();
    attach(stack, loop);

    outside.focus();
    card.focus();
    expect(loop.enter).toHaveBeenCalledWith(
      expect.objectContaining({ origin: outside, target: card })
    );

    press('Escape', card);
    expect(loop.escape).toHaveBeenCalledTimes(1);

    outside.focus();
    expect(loop.exit).toHaveBeenCalledTimes(1);

    stack.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    card.focus();
    expect(loop.enter).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyboard: false })
    );
  });

  it('should detach through the returned function', () => {
    const loop = spied();
    const { stack, card } = makeStack();
    const detach = attach(stack, loop);

    detach();
    card.focus();
    expect(loop.enter).not.toHaveBeenCalled();
  });

  it('should detach when the given signal aborts', () => {
    const loop = spied();
    const { stack, card } = makeStack();
    const owner = new AbortController();
    attach(stack, loop, { signal: owner.signal });

    owner.abort();
    card.focus();
    expect(loop.enter).not.toHaveBeenCalled();
  });
});
