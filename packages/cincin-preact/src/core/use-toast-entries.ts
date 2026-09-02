import type { ToastEntry, Toaster } from 'cincin';
import { getServerSnapshot } from '../shared/ssr';
import { useSyncExternalStore } from '../shared/use-sync-external-store';

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
