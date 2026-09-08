import { createStackLayout } from 'cincin/dom';
import type { StackLayout, StackLayoutOptions } from 'cincin/dom';
import type { Toast } from 'cincin/presenter';
import { onUnmounted, toValue, watchPostEffect } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

type StackOptions = StackLayoutOptions;

function useStack(
  entries: MaybeRefOrGetter<ReadonlyArray<Pick<Toast, 'key' | 'phase'>>>,
  options?: MaybeRefOrGetter<StackOptions>
): { layout: StackLayout } {
  const layout = createStackLayout(toValue(options));

  watchPostEffect(function syncOptions() {
    layout.setOptions(toValue(options) ?? {});
  });

  watchPostEffect(function syncEntries() {
    layout.setEntries(
      toValue(entries).map((toast) => ({
        key: toast.key,
        leaving: toast.phase === 'leaving',
      }))
    );
  });

  onUnmounted(() => {
    layout.destroy();
  });

  return { layout };
}

export { useStack };
export type { StackOptions };
