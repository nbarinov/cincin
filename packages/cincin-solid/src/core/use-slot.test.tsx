import { cleanup, render } from '@solidjs/testing-library';
import { createStackLayout } from 'cincin/dom';
import type { StackLayout, StackSlot } from 'cincin/dom';
import { createSignal } from 'solid-js';
import type { Accessor } from 'solid-js';
import { useSlot } from './use-slot';

/** jsdom lacks ResizeObserver; the layout tolerates silent stubs. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function mountSlotHost(layout: StackLayout, key: string) {
  let slot!: Accessor<StackSlot | undefined>;

  const Host = () => {
    const [element, setElement] = createSignal<HTMLElement>();
    slot = useSlot(element, { layout, key });
    return <li data-testid="card" ref={setElement} />;
  };

  const view = render(() => <Host />);

  return { view, slot: () => slot() };
}

beforeEach(() => {
  window.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
});

describe('useSlot', () => {
  it('should register the element in the render phase, before any effect pass', () => {
    const layout = createStackLayout();
    const { slot } = mountSlotHost(layout, 'a');

    // Straight after the mount, with no ticks in between: the layout
    // protocol wants the card registered before the region's
    // `setEntries` pass (an unregistered key is silently skipped).
    layout.setEntries([{ key: 'a', leaving: false }]);

    expect(slot()).toMatchObject({ front: true, index: 0 });
  });

  it('should follow the layout events live', () => {
    const layout = createStackLayout();
    const { slot } = mountSlotHost(layout, 'a');

    // A second card registered by hand: the observed one loses the
    // front to it on the next pass (stack order fronts the newest).
    layout.setCard('b', document.createElement('li'));
    layout.setEntries([
      { key: 'a', leaving: false },
      { key: 'b', leaving: false },
    ]);

    expect(slot()).toMatchObject({ front: false, index: 1 });
  });

  it('should turn undefined once the key leaves the entries', () => {
    const layout = createStackLayout();
    const { slot } = mountSlotHost(layout, 'a');

    layout.setEntries([{ key: 'a', leaving: false }]);
    expect(slot()).toBeDefined();

    layout.setEntries([]);
    expect(slot()).toBeUndefined();
  });

  it('should deregister the element on unmount', () => {
    const layout = createStackLayout();
    const setCard = vi.spyOn(layout, 'setCard');
    const { view } = mountSlotHost(layout, 'a');

    expect(setCard).toHaveBeenCalledWith('a', expect.any(HTMLElement));

    view.unmount();

    expect(setCard).toHaveBeenLastCalledWith('a', null);
  });
});
