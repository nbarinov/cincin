import { createStackLayout } from 'cincin/dom';
import type { StackLayout, StackLayoutOptions } from 'cincin/dom';
import type { Toast } from 'cincin/presenter';
import { createEffect, onCleanup } from 'solid-js';
import { access } from '../shared/maybe-accessor';
import type { MaybeAccessor } from '../shared/maybe-accessor';

type StackOptions = StackLayoutOptions;

/**
 * A thin binding over the `cincin/dom` stack layout: the primitive
 * owns the instance and feeds it entries from an effect — after the
 * render phase, so every card's ref has registered its element by
 * then (the pass skips unregistered keys), and still before paint.
 * Cards read their slots through `useSlot(element, { layout, key })`.
 */
function useStack(
  entries: MaybeAccessor<ReadonlyArray<Pick<Toast, 'key' | 'phase'>>>,
  options?: MaybeAccessor<StackOptions | undefined>
): { layout: StackLayout } {
  // The body locator rides only the creation: it is read once by the
  // layout, and setOptions leaves it alone.
  const initial = access(options) ?? {};
  const layout = createStackLayout({
    order: initial.order ?? 'stack',
    visible: initial.visible ?? 3,
    gap: initial.gap ?? 12,
    ...(initial.body && { body: initial.body }),
  });

  createEffect(function syncOptions() {
    const live = access(options) ?? {};

    layout.setOptions({
      order: live.order ?? 'stack',
      visible: live.visible ?? 3,
      gap: live.gap ?? 12,
    });
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

  return { layout };
}

export { useStack };
export type { StackOptions };
