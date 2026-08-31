import type { ToastEntry, Toaster } from 'cincin';
import * as React from 'react';
import { getServerSnapshot } from '../shared/ssr';

function useToastEntries<Content extends {}>(
  toaster: Toaster<Content>
): ReadonlyArray<ToastEntry<Content>> {
  return React.useSyncExternalStore(
    toaster.subscribe,
    toaster.getSnapshot,
    getServerSnapshot
  );
}

export { useToastEntries };
