import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, PLATFORM_ID, inject, signal } from '@angular/core';
import type { Signal } from '@angular/core';

type SnapshotStore<T> = {
  subscribe(listener: () => void): () => void;
  getSnapshot(): T;
};

/**
 * The pull half of the core's dual contract as a signal: seeded from
 * the snapshot, following commits through the subscription for as long
 * as the injection context lives. On the server there is nothing to
 * observe: the snapshot stays the initial one, and no subscription is
 * left behind after the render.
 */
function injectSnapshot<T>(store: SnapshotStore<T>): Signal<T> {
  const snapshot = signal(store.getSnapshot());

  if (isPlatformBrowser(inject(PLATFORM_ID))) {
    inject(DestroyRef).onDestroy(
      store.subscribe(() => {
        snapshot.set(store.getSnapshot());
      })
    );
  }

  return snapshot.asReadonly();
}

export { injectSnapshot };
export type { SnapshotStore };
