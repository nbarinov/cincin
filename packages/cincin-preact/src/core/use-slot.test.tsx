import { cleanup } from '@testing-library/preact';
import type { StackLayout } from 'cincin/dom';
import { render } from 'preact';
import { useSlot } from './use-slot';
import { useStack } from './use-stack';

/** jsdom lacks ResizeObserver; the layout tolerates silent stubs. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

let lastLayout!: StackLayout;

function Stack({ keys }: { keys: string[] }) {
  const stack = useStack(keys.map((key) => ({ key, phase: 'active' })));
  lastLayout = stack.layout;

  return (
    <ol>
      {keys.map((key) => (
        <Card key={key} layout={stack.layout} slotKey={key} />
      ))}
    </ol>
  );
}

function Card({ layout, slotKey }: { layout: StackLayout; slotKey: string }) {
  const { ref, slot } = useSlot({ layout, key: slotKey });

  return (
    <li
      ref={ref}
      data-key={slotKey}
      data-front={slot === undefined ? undefined : String(slot.front)}
    />
  );
}

let container!: HTMLDivElement;

beforeEach(() => {
  vi.useFakeTimers();
  window.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
  container = document.createElement('div');
  document.body.append(container);
});

afterEach(() => {
  render(null, container);
  container.remove();
  cleanup();
  vi.useRealTimers();
});

describe('useSlot', () => {
  it('should deliver the mounting commit slot within a microtask, no frame', async () => {
    // No act: the bridge is on its own. The card's subscription opens
    // in a layout effect, ahead of the stack's own layout pass, so the
    // slot that pass assigns reaches the card through Preact's
    // microtask batch. A passive subscription would wait for the
    // after-paint flush (a frame, or the fake timers held here).
    render(<Stack keys={['a']} />, container);
    expect(container.querySelector('li')?.dataset.front).toBeUndefined();

    await Promise.resolve();
    await Promise.resolve();

    expect(container.querySelector('li')?.dataset.front).toBe('true');
  });

  it('should detach the card through the ref cleanup on unmount', () => {
    render(<Stack keys={['a', 'b']} />, container);
    const setCard = vi.spyOn(lastLayout, 'setCard');

    render(<Stack keys={['a']} />, container);

    expect(setCard).toHaveBeenCalledWith('b', null);
    expect(setCard).not.toHaveBeenCalledWith('a', null);
  });
});
