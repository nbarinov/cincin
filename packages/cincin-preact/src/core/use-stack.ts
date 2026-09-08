import { createStackLayout } from 'cincin/dom';
import type { StackLayoutOptions } from 'cincin/dom';
import type { Toast } from 'cincin/presenter';
import { useLayoutEffect, useState } from 'preact/hooks';

type StackOptions = StackLayoutOptions;

/**
 * A thin binding over the `cincin/dom` stack layout:
 * the hook owns the instance and feeds it commits;
 * cards read their slots through `useSlot({ layout, key })`,
 * which also registers their elements.
 */
function useStack(
  entries: ReadonlyArray<Pick<Toast, 'key' | 'phase'>>,
  options: StackOptions = {}
) {
  const { order = 'stack', visible = 3, gap = 12, body } = options;

  const [layout] = useState(() =>
    createStackLayout({ order, visible, gap, body })
  );

  useLayoutEffect(
    function syncOptions() {
      layout.setOptions({ order, visible, gap });
    },
    [layout, order, visible, gap]
  );

  useLayoutEffect(
    function syncEntries() {
      layout.setEntries(
        entries.map((toast) => ({
          key: toast.key,
          leaving: toast.phase === 'leaving',
        }))
      );
    },
    [layout, entries]
  );

  useLayoutEffect(
    function destroyOnUnmount() {
      return () => {
        layout.destroy();
      };
    },
    [layout]
  );

  return { layout };
}

export { useStack };
export type { StackOptions };
