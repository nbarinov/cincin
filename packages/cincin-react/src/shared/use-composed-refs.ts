import type { Ref, RefCallback } from 'react';
import { useCallback } from 'react';

type ComposableRef<T> = Ref<T> | undefined;

function useComposedRefs<T>(...refs: ComposableRef<T>[]): RefCallback<T> {
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- refs is an array of dependencies that should be compared by reference
  return useCallback(composeRefs(...refs), refs);
}

export { useComposedRefs };

// utils

function setRef<T>(ref: ComposableRef<T>, value: T): (() => void) | void {
  if (typeof ref === 'function') {
    return ref(value);
  } else if (ref !== null && ref !== undefined) {
    ref.current = value;
  }
}

function composeRefs<T>(...refs: ComposableRef<T>[]): RefCallback<T> {
  return function composedRef(el) {
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, el);

      if (typeof cleanup === 'function') {
        return cleanup;
      }

      return () => {
        setRef(ref, null);
      };
    });

    return () => {
      cleanups.forEach((cleanup) => {
        cleanup();
      });
    };
  };
}

export { setRef, composeRefs };
