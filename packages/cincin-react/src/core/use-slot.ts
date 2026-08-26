import { createSlotObserver } from 'cincin/dom';
import type { StackLayout, StackSlot } from 'cincin/dom';
import type { ToastKey } from 'cincin/presenter';
import { useCallback, useState, useSyncExternalStore } from 'react';
import type { RefCallback } from 'react';

type SlotOptions = {
  layout: StackLayout;
  key: ToastKey;
};

/**
 * One card's slot, live: a slot observer under the hood, bound through
 * `useSyncExternalStore` (layout passes run before paint, and external
 * store updates flush synchronously, so a measured height lands in the
 * same frame). The ref registers the card's element for measurement;
 * React 19 runs its cleanup on unmount. The layout is read once, like
 * the toaster in `usePresenter` (remount to switch); the `key` stays
 * live through `setOptions`, re-stated on every render before the
 * store read.
 */
function useSlot(options: SlotOptions): {
  ref: RefCallback<HTMLElement>;
  slot: StackSlot | undefined;
} {
  const { layout, key } = options;

  const [observer] = useState(() => createSlotObserver(layout, { key }));
  observer.setOptions({ key });

  const slot = useSyncExternalStore(
    observer.subscribe,
    observer.getSnapshot,
    observer.getSnapshot
  );

  const ref: RefCallback<HTMLElement> = useCallback(
    // A key change re-runs the callback: the old call's cleanup
    // releases the old key's registration, this one claims the new.
    (element) => (element === null ? undefined : observer.observe(element)),
    [observer, key]
  );

  return { ref, slot };
}

export { useSlot };
export type { SlotOptions };
