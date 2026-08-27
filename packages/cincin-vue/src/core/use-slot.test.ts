import { cleanup, render } from '@testing-library/vue';
import { createStackLayout } from 'cincin/dom';
import type { StackLayout, StackSlot } from 'cincin/dom';
import { defineComponent, h, shallowRef } from 'vue';
import type { Ref } from 'vue';
import { useSlot } from './use-slot';

/** jsdom lacks ResizeObserver; the layout tolerates silent stubs. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function mountSlotHost(layout: StackLayout, key: string) {
  let slot!: Readonly<Ref<StackSlot | undefined>>;
  const element = shallowRef<HTMLElement | null>(null);

  const Host = defineComponent({
    setup() {
      slot = useSlot(element, { layout, key });
      return () => h('li', { 'data-testid': 'card', ref: element });
    },
  });

  const view = render(Host);

  return { view, slot: () => slot.value };
}

beforeEach(() => {
  window.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
});

describe('useSlot', () => {
  it('should register the element in the same patch, before any post pass', () => {
    const layout = createStackLayout();
    const { slot } = mountSlotHost(layout, 'a');

    // Straight after the mount, with no ticks in between: the layout
    // protocol wants the card registered before the region's post-flush
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
