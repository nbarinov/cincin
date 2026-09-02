import { act, cleanup, renderHook } from '@testing-library/preact';
import { useSyncExternalStore } from './use-sync-external-store';

/** A minimal store: a value, a change signal, and a listener count. */
function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();

  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => value,
    set: (next: T) => {
      value = next;
      for (const listener of listeners) {
        listener();
      }
    },
    get size() {
      return listeners.size;
    },
  };
}

afterEach(() => {
  cleanup();
});

describe('useSyncExternalStore', () => {
  it('should read the snapshot and follow changes', () => {
    const store = createStore(1);
    const { result } = renderHook(() =>
      useSyncExternalStore(store.subscribe, store.getSnapshot, () => 0)
    );
    expect(result.current).toBe(1);

    act(() => store.set(2));
    expect(result.current).toBe(2);
  });

  it('should subscribe in the mounting commit and drop the listener on unmount', () => {
    const store = createStore('a');
    let listeners = -1;

    // The count is sampled by a layout effect declared after the hook:
    // a passive subscription would still be pending here.
    const { unmount } = renderHook(() => {
      const value = useSyncExternalStore(
        store.subscribe,
        store.getSnapshot,
        () => 'server'
      );
      listeners = store.size;
      return value;
    });
    expect(listeners).toBe(0);
    expect(store.size).toBe(1);

    unmount();
    expect(store.size).toBe(0);
  });

  it('should catch up on a store that moved between render and commit', () => {
    const store = createStore(1);
    let renders = 0;

    const { result } = renderHook(() => {
      renders += 1;
      const value = useSyncExternalStore(
        store.subscribe,
        store.getSnapshot,
        () => 0
      );
      if (renders === 1) {
        // Moves the store after the first render read it, before any
        // effect ran: the commit-time check must notice and re-render.
        store.set(2);
      }
      return value;
    });

    expect(result.current).toBe(2);
  });
});
