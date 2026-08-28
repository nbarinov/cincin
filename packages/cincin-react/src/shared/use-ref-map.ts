import type { RefCallback } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useLatestRef } from './use-latest-ref';

type RefMapOptions<Key, Value> = {
  /**
   * Fires on attach (with the value) and on detach (with null).
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
 * A registry of "key to value behind a ref". The callback never
 * returns a cleanup: React 18 ignores the returned function (with a
 * warning) and both majors fall back to calling the ref with null, so
 * the null branch is the one detach path that works everywhere.
 *
 * A detach is a node event, not a key death: React re-runs the ref
 * while a key is alive (StrictMode replays, composed-ref identity
 * changes), and pruning the callback cache right there would hand the
 * next render a fresh callback, retriggering the very re-run that
 * pruned it. Instead a detach enqueues the key for burial and a shared
 * timer flushes the queue: replays and node swaps re-attach within the
 * same commit, synchronously, before any timer, so a key still
 * valueless at flush time is truly gone. Re-attaching also dequeues
 * the key outright.
 */
function useRefMap<Key, Value>(options: RefMapOptions<Key, Value> = {}) {
  const values = useRef(new Map<Key, Value>());
  const refs = useRef(new Map<Key, RefCallback<Value>>());
  const onChangeRef = useLatestRef(options.onChange);

  const burials = useRef(new Set<Key>());
  const flushTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

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
          if (value !== null) {
            burials.current.delete(key);
            values.current.set(key, value);
            onChangeRef.current?.(key, value);

            return;
          }

          if (!values.current.has(key)) {
            return;
          }

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
