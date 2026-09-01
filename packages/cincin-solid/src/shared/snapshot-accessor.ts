import { createSignal, onCleanup } from 'solid-js';
import { isServer } from 'solid-js/web';
import type { Accessor } from 'solid-js';

type SnapshotStore<T> = {
  subscribe(listener: () => void): () => void;
  getSnapshot(): T;
};

/** The pull half of the core's dual contract as an accessor: seeded
 * from the snapshot, following commits through the subscription. On
 * the server there is nothing to observe: the snapshot stays the
 * initial one, and no subscription is left behind after the render. */
function createSnapshotAccessor<T>(store: SnapshotStore<T>): Accessor<T> {
  const [snapshot, setSnapshot] = createSignal(store.getSnapshot());

  if (isServer) {
    return snapshot;
  }

  onCleanup(
    store.subscribe(() => {
      setSnapshot(() => store.getSnapshot());
    })
  );

  return snapshot;
}

export { createSnapshotAccessor };
export type { SnapshotStore };
