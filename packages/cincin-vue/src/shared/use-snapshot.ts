import { onScopeDispose, shallowRef } from 'vue';
import type { Ref } from 'vue';

type SnapshotStore<T> = {
  subscribe(listener: () => void): () => void;
  getSnapshot(): T;
};

function useSnapshot<T>(store: SnapshotStore<T>): Readonly<Ref<T>> {
  const snapshot = shallowRef(store.getSnapshot());

  if (typeof window !== 'undefined') {
    onScopeDispose(
      store.subscribe(() => {
        snapshot.value = store.getSnapshot();
      })
    );
  }

  return snapshot;
}

export { useSnapshot };
export type { SnapshotStore };
