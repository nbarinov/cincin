import { useLayoutEffect, useRef, useState } from 'react';
import { createStackLayout } from 'cincin/dom';
import type { StackLayoutConfig } from 'cincin/dom';
import type { Toast, ToastKey } from 'cincin/presenter';
import { useRefMap } from '../shared/use-ref-map';

type StackOptions = StackLayoutConfig;

/** A thin binding over the `cincin/dom` stack layout: the controller
 * owns the geometry (slots, heights, the ResizeObserver); the hook
 * feeds it commits and hands out stable card refs. */
function useStack(
  entries: ReadonlyArray<Pick<Toast, 'key' | 'phase'>>,
  options: StackOptions = {}
) {
  const { order = 'stack', visible = 3, gap = 12 } = options;
  const [layout] = useState(() => createStackLayout({ order, visible, gap }));
  const cards = useRefMap<ToastKey, HTMLElement>({
    onChange: (key, element) => layout.setCard(key, element),
  });
  const aliveIds = useRef(new Set<ToastKey>());

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

      // The data pass is the only reliable "truly gone" signal: the
      // registry entries of departed toasts are released here, never
      // from ref cleanups (those re-run while the toast is alive).
      const alive = new Set(entries.map((toast) => toast.key));
      for (const key of aliveIds.current) {
        if (!alive.has(key)) {
          cards.release(key);
        }
      }
      aliveIds.current = alive;
    },
    [layout, cards, entries]
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
