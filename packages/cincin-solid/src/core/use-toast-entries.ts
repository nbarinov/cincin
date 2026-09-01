import type { ToastEntry, Toaster } from 'cincin';
import type { Accessor } from 'solid-js';
import { createSnapshotAccessor } from '../shared/snapshot-accessor';

function useToastEntries<Content extends {}>(
  toaster: Toaster<Content>
): Accessor<ReadonlyArray<ToastEntry<Content>>> {
  return createSnapshotAccessor(toaster);
}

export { useToastEntries };
