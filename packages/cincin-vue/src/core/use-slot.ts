import { createSlotObserver } from 'cincin/dom';
import type { StackLayout, StackSlot } from 'cincin/dom';
import type { ToastKey } from 'cincin/presenter';
import { onScopeDispose, shallowRef, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';

type SlotOptions = {
  layout: StackLayout;
  key: ToastKey;
};

/**
 * One card's slot, live: a slot observer under the hood, bound to a
 * shallow ref (layout passes run synchronously, so a measured height
 * lands in the same frame as the post-flush registration). The element
 * source registers the card's element for measurement. The layout and
 * the key are read once: a card lives and dies with its list key, so
 * they cannot change under a live instance.
 */
function useSlot(
  element: MaybeRefOrGetter<HTMLElement | null>,
  options: SlotOptions
): Readonly<Ref<StackSlot | undefined>> {
  const { layout, key } = options;
  const observer = createSlotObserver(layout, { key });

  const slot = shallowRef(observer.getSnapshot());

  if (typeof window !== 'undefined') {
    onScopeDispose(
      observer.subscribe(() => {
        slot.value = observer.getSnapshot();
      })
    );
  }

  // Sync, not post: the layout protocol wants every card registered
  // before the region's post-flush `setEntries` pass (the pass skips
  // unregistered keys). A template ref lands during the patch, so a
  // sync watcher mirrors React's refs-before-layout-effects timing.
  watch(
    () => toValue(element),
    (el, _previous, onCleanup) => {
      if (el === null) {
        return;
      }

      onCleanup(observer.observe(el));
    },
    { immediate: true, flush: 'sync' }
  );

  return slot;
}

export { useSlot };
export type { SlotOptions };
