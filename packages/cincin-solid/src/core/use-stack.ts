import { createStackLayout } from 'cincin/dom';
import type { StackLayout, StackLayoutOptions } from 'cincin/dom';
import type { Toast } from 'cincin/presenter';
import { createEffect, onCleanup } from 'solid-js';
import { access } from '../shared/maybe-accessor';
import type { MaybeAccessor } from '../shared/maybe-accessor';

type StackOptions = StackLayoutOptions;

function useStack(
  entries: MaybeAccessor<ReadonlyArray<Pick<Toast, 'key' | 'phase'>>>,
  options?: MaybeAccessor<StackOptions | undefined>
): { layout: StackLayout } {
  const layout = createStackLayout(access(options));

  createEffect(function syncOptions() {
    layout.setOptions(access(options) ?? {});
  });

  createEffect(function syncEntries() {
    layout.setEntries(
      (access(entries) ?? []).map((toast) => ({
        key: toast.key,
        leaving: toast.phase === 'leaving',
      }))
    );
  });

  onCleanup(() => {
    layout.destroy();
  });

  return { layout };
}

export { useStack };
export type { StackOptions };
