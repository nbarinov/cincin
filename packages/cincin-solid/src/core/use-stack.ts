import { attachViewportBox, createStackLayout } from 'cincin/dom';
import type { StackLayout, StackLayoutOptions } from 'cincin/dom';
import type { Toast } from 'cincin/presenter';
import { createEffect, onCleanup } from 'solid-js';
import { access } from '../shared/maybe-accessor';
import type { MaybeAccessor } from '../shared/maybe-accessor';

type StackOptions = StackLayoutOptions;

function useStack(
  entries: MaybeAccessor<ReadonlyArray<Pick<Toast, 'key' | 'phase'>>>,
  options?: MaybeAccessor<StackOptions | undefined>
): { layout: StackLayout; ref: (element: HTMLElement) => void } {
  const layout = createStackLayout(access(options));

  createEffect(function syncOptions() {
    layout.setOptions(access(options) ?? {});
  });

  createEffect(function syncEntries() {
    layout.setEntries(
      (access(entries) ?? []).map((toast) => ({
        key: toast.key,
        leaving: toast.phase === 'leaving',
      }))
    );
  });

  onCleanup(() => {
    layout.destroy();
  });

  // Solid calls a ref once, with the element; the detach rides the
  // owner's disposal.
  const ref = (element: HTMLElement): void => {
    onCleanup(attachViewportBox(element, layout));
  };

  return { layout, ref };
}

export { useStack };
export type { StackOptions };
