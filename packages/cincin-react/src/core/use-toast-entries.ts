import type { ToastEntry, Toaster } from 'cincin';
import { useSyncExternalStore } from 'react';
import { getServerSnapshot } from '../shared/ssr';

function useToastEntries<Content extends {}>(
  toaster: Toaster<Content>
): ReadonlyArray<ToastEntry<Content>> {
  return useSyncExternalStore(
    toaster.subscribe,
    toaster.getSnapshot,
    getServerSnapshot
  );
}

export { useToastEntries };
