import { useLayoutEffect, useReducer, useState } from 'preact/hooks';

type Subscribe = (onChange: () => void) => () => void;

type StoreBox<T> = {
  value: T;
  getSnapshot: () => T;
};

/**
 * The React primitive that `preact/hooks` lacks, cut for this package
 * after the React shim, with one deliberate change: the store box is
 * refreshed and the subscription opened in layout effects, not passive
 * ones. Preact runs passive effects after paint, so a slot measured in
 * the mounting commit would find no listener and reach its card a
 * frame late; a layout subscription is in place before the stack's
 * own layout pass, and the change it reports queues a re-render
 * through Preact's microtask batch, still ahead of paint.
 *
 * On the server the snapshot comes from `getServerSnapshot` and no
 * effect runs: hydration compares against that value.
 */
function useSyncExternalStore<T>(
  subscribe: Subscribe,
  getSnapshot: () => T,
  getServerSnapshot: () => T
): T {
  const value = isServer() ? getServerSnapshot() : getSnapshot();
  const [box] = useState<StoreBox<T>>(() => ({ value, getSnapshot }));
  const [, rerender] = useReducer<number, void>(increment, 0);

  useLayoutEffect(
    function refreshBox() {
      box.value = value;
      box.getSnapshot = getSnapshot;

      if (isStale(box)) {
        rerender();
      }
    },
    [box, subscribe, value, getSnapshot]
  );

  useLayoutEffect(
    function open() {
      const check = () => {
        if (isStale(box)) {
          rerender();
        }
      };

      // The store may have moved between the render and this commit.
      check();

      return subscribe(check);
    },
    [box, subscribe]
  );

  return value;
}

export { useSyncExternalStore };

// utils

function isServer(): boolean {
  return typeof window === 'undefined';
}

function increment(count: number): number {
  return count + 1;
}

function isStale<T>(box: StoreBox<T>): boolean {
  try {
    return !Object.is(box.value, box.getSnapshot());
  } catch {
    // A snapshot that throws is a store in transit: re-render and let
    // the render surface the error, as the React shim does.
    return true;
  }
}
