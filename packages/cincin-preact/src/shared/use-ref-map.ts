import type { RefCallback } from 'preact';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import { useLatestRef } from './use-latest-ref';

type RefMapOptions<Key, Value> = {
  /**
   * Fires on attach (with the value) and on ref cleanup (with null).
   * Always the latest render's callback, so it may close over props.
   */
  onChange?: (key: Key, value: Value | null) => void;
};

interface RefMap<Key, Value> {
  /** A stable ref callback per key, cached for the key's lifetime. */
  getRef: (key: Key) => RefCallback<Value>;
  /** Live, non-reactive read: for effects and callbacks, not render. */
  get: (key: Key) => Value | undefined;
}

const BURIAL_DELAY = 200;

/**
 * A registry of "key to value behind a ref". Detach rides the cleanup
 * returned from the ref callback (Preact 10.23 and up). A ref cleanup
 * is a node event, not a key death: Preact re-runs the ref while a key
 * is alive (a node swapped under a kept key, a ref identity change),
 * and pruning the callback cache right there would hand the next
 * render a fresh callback, retriggering the very re-run that pruned
 * it. Instead a cleanup enqueues the key for burial and a shared timer
 * flushes the queue: node swaps re-attach within the same commit,
 * synchronously, before any timer, so a key still valueless at flush
 * time is truly gone. Re-attaching also dequeues the key outright.
 */
function useRefMap<Key, Value>(options: RefMapOptions<Key, Value> = {}) {
  const values = useRef(new Map<Key, Value>());
  const refs = useRef(new Map<Key, RefCallback<Value>>());
  const onChangeRef = useLatestRef(options.onChange);

  const burials = useRef(new Set<Key>());
  const flushTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(function cancelBurials() {
    return () => {
      if (flushTimer.current !== undefined) {
        clearTimeout(flushTimer.current);
        flushTimer.current = undefined;
      }
    };
  }, []);

  return useMemo<RefMap<Key, Value>>(
    () => ({
      getRef: (key: Key) => {
        const cached = refs.current.get(key);
        if (cached !== undefined) {
          return cached;
        }

        const ref: RefCallback<Value> = (value) => {
          if (value === null) {
            return;
          }

          burials.current.delete(key);
          values.current.set(key, value);
          onChangeRef.current?.(key, value);

          return () => {
            values.current.delete(key);
            onChangeRef.current?.(key, null);

            burials.current.add(key);

            flushTimer.current ??= setTimeout(() => {
              flushTimer.current = undefined;
              for (const buried of burials.current) {
                if (!values.current.has(buried)) {
                  refs.current.delete(buried);
                }
              }

              burials.current.clear();
            }, BURIAL_DELAY);
          };
        };

        refs.current.set(key, ref);

        return ref;
      },
      get: (key: Key) => values.current.get(key),
    }),
    [onChangeRef]
  );
}

export { useRefMap, BURIAL_DELAY };
export type { RefMap, RefMapOptions };
