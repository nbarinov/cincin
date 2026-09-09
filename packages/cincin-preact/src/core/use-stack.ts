import { attachViewportBox, createStackLayout } from 'cincin/dom';
import type { StackLayoutOptions } from 'cincin/dom';
import type { Toast } from 'cincin/presenter';
import type { RefCallback } from 'preact';
import { useCallback, useLayoutEffect, useRef, useState } from 'preact/hooks';

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

  const detach = useRef<(() => void) | undefined>(undefined);
  const ref: RefCallback<HTMLElement> = useCallback(
    (element) => {
      detach.current?.();
      detach.current =
        element === null ? undefined : attachViewportBox(element, layout);
    },
    [layout]
  );

  return { layout, ref };
}

export { useStack };
export type { StackOptions };
