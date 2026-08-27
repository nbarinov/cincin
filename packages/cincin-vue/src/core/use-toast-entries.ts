import type { ToastEntry, Toaster } from 'cincin';
import { onScopeDispose, shallowRef } from 'vue';
import type { Ref } from 'vue';

function useToastEntries<Content extends {}>(
  toaster: Toaster<Content>
): Readonly<Ref<ReadonlyArray<ToastEntry<Content>>>> {
  const entries = shallowRef(toaster.getSnapshot());

  // On the server there is nothing to observe: the snapshot stays the
  // initial one, and no subscription is left behind after the render.
  if (typeof window !== 'undefined') {
    onScopeDispose(
      toaster.subscribe(() => {
        entries.value = toaster.getSnapshot();
      })
    );
  }

  return entries;
}

export { useToastEntries };
