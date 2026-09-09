import { attachViewportBox, createStackLayout } from 'cincin/dom';
import type { StackLayout, StackLayoutOptions } from 'cincin/dom';
import type { Toast } from 'cincin/presenter';
import { onUnmounted, toValue, watchPostEffect } from 'vue';
import type { ComponentPublicInstance, MaybeRefOrGetter } from 'vue';

type StackOptions = StackLayoutOptions;

function useStack(
  entries: MaybeRefOrGetter<ReadonlyArray<Pick<Toast, 'key' | 'phase'>>>,
  options?: MaybeRefOrGetter<StackOptions>
): {
  layout: StackLayout;
  ref: (element: Element | ComponentPublicInstance | null) => void;
} {
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

  // A function ref: Vue calls it with the element on mount and with
  // null on unmount.
  let detach: (() => void) | undefined;
  const ref = (element: Element | ComponentPublicInstance | null): void => {
    detach?.();
    detach =
      element instanceof HTMLElement
        ? attachViewportBox(element, layout)
        : undefined;
  };

  return { layout, ref };
}

export { useStack };
export type { StackOptions };
