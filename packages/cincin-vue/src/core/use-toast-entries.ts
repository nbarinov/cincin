import type { ToastEntry, Toaster } from 'cincin';
import type { Ref } from 'vue';
import { useSnapshot } from '../shared/use-snapshot';

function useToastEntries<Content extends {}>(
  toaster: Toaster<Content>
): Readonly<Ref<ReadonlyArray<ToastEntry<Content>>>> {
  return useSnapshot(toaster);
}

export { useToastEntries };
