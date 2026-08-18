import type { RefCallback } from 'react';
import { useMemo, useRef } from 'react';

interface RefMap<Key, Value> {
  /** A stable ref callback per key, cached for the key's lifetime. */
  getRef: (key: Key) => RefCallback<Value>;
  /** Live, non-reactive read: for effects and callbacks, not render. */
  get: (key: Key) => Value | undefined;
  /** Drops the key's value and its cached ref callback. */
  release: (key: Key) => void;
}

/**
 * A registry of "key to value behind a ref". The ref cleanup must not
 * prune the callback cache: React re-runs cleanups on StrictMode
 * double-mounts and on composed-ref identity changes, and a pruned
 * cache would hand the next render a fresh callback, retriggering the
 * very re-run that pruned it. Only the owner of the data knows a key
 * is truly gone: it calls release explicitly.
 */
function useRefMap<Key, Value>() {
  const values = useRef(new Map<Key, Value>());
  const refs = useRef(new Map<Key, RefCallback<Value>>());

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

          values.current.set(key, value);

          return () => {
            values.current.delete(key);
          };
        };

        refs.current.set(key, ref);

        return ref;
      },
      get: (key: Key) => values.current.get(key),
      release: (key: Key) => {
        values.current.delete(key);
        refs.current.delete(key);
      },
    }),
    []
  );
}

export { useRefMap };
export type { RefMap };
