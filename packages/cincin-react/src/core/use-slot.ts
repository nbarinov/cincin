import { createSlotObserver } from 'cincin/dom';
import type { StackLayout, StackSlot } from 'cincin/dom';
import type { ToastKey } from 'cincin/presenter';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
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
 * React 19 runs its cleanup on unmount. The observer is a stateless
 * lens, so `useMemo` recreation on a changed layout or key is free:
 * the store resubscribes on the new identity, nothing is lost.
 */
function useSlot(options: SlotOptions): {
  ref: RefCallback<HTMLElement>;
  slot: StackSlot | undefined;
} {
  const { layout, key } = options;

  const observer = useMemo(
    () => createSlotObserver(layout, { key }),
    [layout, key]
  );

  const slot = useSyncExternalStore(
    observer.subscribe,
    observer.getSnapshot,
    observer.getSnapshot
  );

  const ref: RefCallback<HTMLElement> = useCallback(
    (element) => (element === null ? undefined : observer.observe(element)),
    [observer]
  );

  return { ref, slot };
}

export { useSlot };
export type { SlotOptions };
