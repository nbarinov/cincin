import type { Toaster, ToastEntry } from 'cincin';
import { inject, provide } from 'vue';
import type { InjectionKey, Ref } from 'vue';
import { useToastEntries as useToastEntriesOf } from './use-toast-entries';

function createToasterContext<Content extends {} = string>(
  defaultToaster?: Toaster<Content>
) {
  const key: InjectionKey<Toaster<Content>> = Symbol('cincin:toaster');

  function provideToaster(toaster: Toaster<Content>): void {
    provide(key, toaster);
  }

  function useToaster(toaster?: Toaster<Content>): Toaster<Content> {
    const resolved = toaster ?? inject(key, null) ?? defaultToaster ?? null;

    if (resolved === null) {
      throw new Error(
        '[cincin] no toaster available. Pass one to createToasterContext, call provideToaster in an ancestor, or provide an instance explicitly.'
      );
    }

    return resolved;
  }

  function useToastEntries(
    toaster?: Toaster<Content>
  ): Readonly<Ref<ReadonlyArray<ToastEntry<Content>>>> {
    return useToastEntriesOf(useToaster(toaster));
  }

  return { provideToaster, useToaster, useToastEntries };
}

export { createToasterContext };
