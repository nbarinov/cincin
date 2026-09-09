import * as React from 'react';
import { attachViewportBox, createStackLayout } from 'cincin/dom';
import type { StackLayoutOptions } from 'cincin/dom';
import type { Toast } from 'cincin/presenter';
import type { RefCallback } from 'react';

type StackOptions = StackLayoutOptions;

function useStack(
  entries: ReadonlyArray<Pick<Toast, 'key' | 'phase'>>,
  options: StackOptions = {}
) {
  const { order, visible, gap } = options;

  const [layout] = React.useState(() => createStackLayout(options));

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

  const detach = React.useRef<(() => void) | undefined>(undefined);
  const ref: RefCallback<HTMLElement> = React.useCallback(
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
