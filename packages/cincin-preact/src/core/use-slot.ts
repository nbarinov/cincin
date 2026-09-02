import { createSlotObserver } from 'cincin/dom';
import type { StackLayout, StackSlot } from 'cincin/dom';
import type { ToastKey } from 'cincin/presenter';
import type { RefCallback } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';
import { useSyncExternalStore } from '../shared/use-sync-external-store';

type SlotOptions = {
  layout: StackLayout;
  key: ToastKey;
};

/**
 * One card's slot, live: a slot observer under the hood, bound through
 * the external store bridge (a layout subscription, so a height
 * measured in the mounting commit lands in the same frame). The ref
 * registers the card's element for measurement and returns the detach
 * as its cleanup; Preact runs it on unmount. The observer is a
 * stateless lens, so `useMemo` recreation on a changed layout or key
 * is free: the store resubscribes on the new identity, nothing is
 * lost.
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
