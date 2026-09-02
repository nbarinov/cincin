import type { MutableRef } from 'preact/hooks';
import { useRef } from 'preact/hooks';

/**
 * A box that always holds the latest render's value. The write happens
 * in render on purpose: Preact renders synchronously and never discards
 * a render, so it lands exactly once per commit and is fresh by the
 * time that commit's refs and effects run (the slot React reserves for
 * `useInsertionEffect`, which `preact/hooks` does not have).
 */
function useLatestRef<T>(value: T): MutableRef<T> {
  const ref = useRef<T>(value);

  ref.current = value;

  return ref;
}

export { useLatestRef };
