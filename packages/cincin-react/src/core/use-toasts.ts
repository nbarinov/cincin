import type { Toast, Toaster } from 'cincin';
import { useSyncExternalStore } from 'react';
import { getServerSnapshot } from '../shared/ssr';

function useToasts<Content extends {}>(
  toaster: Toaster<Content>
): ReadonlyArray<Toast<Content>> {
  return useSyncExternalStore(
    toaster.subscribe,
    toaster.getSnapshot,
    getServerSnapshot
  );
}

export { useToasts };
