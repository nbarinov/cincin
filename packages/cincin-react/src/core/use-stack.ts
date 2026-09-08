import * as React from 'react';
import { createStackLayout } from 'cincin/dom';
import type { StackLayoutOptions } from 'cincin/dom';
import type { Toast } from 'cincin/presenter';

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

  const [layout] = React.useState(() =>
    createStackLayout({ order, visible, gap, body })
  );

  React.useLayoutEffect(
    function syncOptions() {
      layout.setOptions({ order, visible, gap });
    },
    [layout, order, visible, gap]
  );

  React.useLayoutEffect(
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

  React.useLayoutEffect(
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
