import { createStackLayout } from 'cincin/dom';
import type { StackLayout, StackLayoutOptions } from 'cincin/dom';
import type { Toast } from 'cincin/presenter';
import { onUnmounted, toValue, watchPostEffect } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

type StackOptions = StackLayoutOptions;

/**
 * A thin binding over the `cincin/dom` stack layout: the composable
 * owns the instance and feeds it entries after every DOM patch; cards
 * read their slots through `useSlot(element, { layout, key })`
 * (which also registers their elements).
 */
function useStack(
  entries: MaybeRefOrGetter<ReadonlyArray<Pick<Toast, 'key' | 'phase'>>>,
  options?: MaybeRefOrGetter<StackOptions>
): { layout: StackLayout } {
  // The body locator rides only the creation: it is read once by the
  // layout, and setOptions leaves it alone.
  const {
    order = 'stack',
    visible = 3,
    gap = 12,
    body,
  } = toValue(options) ?? {};
  const layout = createStackLayout({
    order,
    visible,
    gap,
    ...(body && { body }),
  });

  watchPostEffect(function syncOptions() {
    const live = toValue(options) ?? {};

    layout.setOptions({
      order: live.order ?? 'stack',
      visible: live.visible ?? 3,
      gap: live.gap ?? 12,
    });
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
