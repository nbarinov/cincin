import type { RefObject } from 'react';
import * as React from 'react';

function useLatestRef<T>(value: T): RefObject<T> {
  const ref = React.useRef<T>(value);

  React.useInsertionEffect(function sync() {
    ref.current = value;
  });

  return ref;
}

export { useLatestRef };
