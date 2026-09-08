import { createStackLayout } from 'cincin/dom';
import type { StackLayoutOptions } from 'cincin/dom';
import type { Toast } from 'cincin/presenter';
import { useLayoutEffect, useState } from 'preact/hooks';

type StackOptions = StackLayoutOptions;

function useStack(
  entries: ReadonlyArray<Pick<Toast, 'key' | 'phase'>>,
  options: StackOptions = {}
) {
  const { order, visible, gap } = options;

  const [layout] = useState(() => createStackLayout(options));

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
