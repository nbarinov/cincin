import { createSlotObserver } from 'cincin/dom';
import type { StackLayout, StackSlot } from 'cincin/dom';
import type { ToastKey } from 'cincin/presenter';
import { createRenderEffect, onCleanup } from 'solid-js';
import type { Accessor } from 'solid-js';
import { access } from '../shared/maybe-accessor';
import type { MaybeAccessor } from '../shared/maybe-accessor';
import { createSnapshotAccessor } from '../shared/snapshot-accessor';

type SlotOptions = {
  layout: StackLayout;
  key: ToastKey;
};

/**
 * One card's slot, live: a slot observer under the hood, bound to a
 * signal (layout passes run synchronously, so a measured height lands
 * in the same frame). The element source registers the card's element
 * for measurement. The layout and the key are read once: a card lives
 * and dies with its list key, so they cannot change under a live
 * instance.
 *
 * Registration rides a render effect on purpose: a signal ref lands
 * during the card's render, so the element is registered before the
 * region's `setEntries` effect runs its pass (the pass skips
 * unregistered keys) — the Solid spelling of refs-before-effects.
 */
function useSlot(
  element: MaybeAccessor<HTMLElement | undefined>,
  options: SlotOptions
): Accessor<StackSlot | undefined> {
  const { layout, key } = options;
  const observer = createSlotObserver(layout, { key });
  const slot = createSnapshotAccessor(observer);

  createRenderEffect(() => {
    const el = access(element);

    if (el === undefined) {
      return;
    }

    onCleanup(observer.observe(el));
  });

  return slot;
}

export { useSlot };
export type { SlotOptions };
