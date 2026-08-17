import type { RefObject } from 'react';
import { useInsertionEffect, useRef } from 'react';

function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef<T>(value);

  useInsertionEffect(function sync() {
    ref.current = value;
  });

  return ref;
}

export { useLatestRef };
