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

/**
 * The radix-ui compose-refs shape. The composite returns a cleanup
 * only when some part returned one (a 19-style ref from userland):
 * React 19 then honors the teardown, cleanup-aware parts run their
 * cleanups, the rest get the null reset. Our own refs are cleanup
 * free, so the everyday path returns nothing; React 18 (which logs an
 * error for any returned value) stays silent there, and both majors
 * call the ref with null to tear the parts down.
 */
function composeRefs<T>(...refs: ComposableRef<T>[]): RefCallback<T> {
  return function composedRef(el) {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, el);
      hasCleanup ||= typeof cleanup === 'function';

      return cleanup;
    });

    if (hasCleanup) {
      return () => {
        refs.forEach((ref, index) => {
          const cleanup = cleanups[index];

          if (typeof cleanup === 'function') {
            cleanup();
          } else {
            setRef(ref, null);
          }
        });
      };
    }
  };
}

export { setRef, composeRefs };
