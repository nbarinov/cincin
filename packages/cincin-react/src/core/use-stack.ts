import { useLayoutEffect, useState } from 'react';
import { createStackLayout } from 'cincin/dom';
import type { StackLayoutConfig } from 'cincin/dom';
import type { Toast, ToastKey } from 'cincin/presenter';
import { useRefMap } from '../shared/use-ref-map';

type StackOptions = StackLayoutConfig;

/** A thin binding over the `cincin/dom` stack layout: the controller
 * owns the geometry (slots, heights, the ResizeObserver); the hook
 * feeds it commits and hands out stable card refs. Cleanup is split by
 * signal: the layout sweeps its per-key state when a key leaves the
 * rendered list, the ref registry buries dead callbacks on its own
 * deferred node-lifecycle check. */
function useStack(
  entries: ReadonlyArray<Pick<Toast, 'key' | 'phase'>>,
  options: StackOptions = {}
) {
  const { order = 'stack', visible = 3, gap = 12 } = options;
  const [layout] = useState(() => createStackLayout({ order, visible, gap }));
  const cards = useRefMap<ToastKey, HTMLElement>({
    onChange: (key, element) => layout.setCard(key, element),
  });

  useLayoutEffect(
    function syncConfig() {
      layout.setConfig({ order, visible, gap });
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

  return { cardRef: cards.getRef };
}

export { useStack };
export type { StackOptions };
