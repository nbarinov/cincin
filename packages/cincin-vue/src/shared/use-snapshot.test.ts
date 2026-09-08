import { effectScope } from 'vue';
import { useSnapshot } from './use-snapshot';
import type { SnapshotStore } from './use-snapshot';

/** A store with a settable snapshot and a countable subscription. */
function makeStore(initial: number) {
  let value = initial;
  const listeners = new Set<() => void>();

  const store: SnapshotStore<number> = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => value,
  };

  return {
    store,
    commit(next: number) {
      value = next;
      for (const listener of listeners) {
        listener();
      }
    },
    listeners: () => listeners.size,
  };
}

describe('useSnapshot', () => {
  it('should seed the ref from the snapshot', () => {
    const { store } = makeStore(1);
    const scope = effectScope();

    const snapshot = scope.run(() => useSnapshot(store))!;

    expect(snapshot.value).toBe(1);
    scope.stop();
  });

  it('should follow the commits', () => {
    const { store, commit } = makeStore(1);
    const scope = effectScope();
    const snapshot = scope.run(() => useSnapshot(store))!;

    commit(2);

    expect(snapshot.value).toBe(2);
    scope.stop();
  });

  it('should unsubscribe when the scope stops', () => {
    const { store, commit, listeners } = makeStore(1);
    const scope = effectScope();
    const snapshot = scope.run(() => useSnapshot(store))!;
    expect(listeners()).toBe(1);

    scope.stop();
    commit(2);

    expect(listeners()).toBe(0);
    expect(snapshot.value).toBe(1);
  });
});
