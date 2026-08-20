import { useLayoutEffect, useRef } from 'react';
import { useRefMap } from '../shared/use-ref-map';
import type { Toast, ToastKey } from 'cincin/presenter';

type ToastSlot = {
  index: number;
  offset: number;
  zIndex: number;
  hidden: boolean;
};

type StackOptions = {
  order?: 'stack' | 'queue';
  visible?: number;
  gap?: number;
};

function useStack(
  entries: ReadonlyArray<Pick<Toast, 'key' | 'phase'>>,
  options: StackOptions = {}
) {
  const { order = 'stack', visible = 3, gap = 12 } = options;
  const elements = useRefMap<ToastKey, HTMLElement>();
  const slots = useRef(new Map<ToastKey, ToastSlot>());
  const aliveIds = useRef(new Set<ToastKey>());

  useLayoutEffect(
    function layoutStack() {
      const next = new Map<ToastKey, ToastSlot>();
      let offset = 0;
      let depth = 0;

      const isStack = order === 'stack';
      const front = isStack ? entries.length - 1 : 0;
      const step = isStack ? -1 : 1;

      for (let i = front; i >= 0 && i < entries.length; i += step) {
        const toast = entries[i]!;
        const element = elements.get(toast.key);

        if (element === undefined) {
          continue;
        }

        const leaving = toast.phase === 'leaving';
        const slot = leaving
          ? slots.current.get(toast.key)
          : {
              index: depth,
              offset,
              zIndex: entries.length - depth,
              hidden: depth >= visible,
            };

        if (slot !== undefined) {
          next.set(toast.key, slot);
          element.style.setProperty('--index', String(slot.index));
          element.style.setProperty('--offset', `${slot.offset}px`);
          element.style.zIndex = String(slot.zIndex);
          element.dataset.hidden = String(slot.hidden);
        }

        if (!leaving) {
          offset += element.offsetHeight + gap;
          depth += 1;
        }
      }

      slots.current = next;

      // The data pass is the only reliable "truly gone" signal, so the
      // registry entries of departed toasts are released here, never
      // from ref cleanups (those re-run while the toast is alive).
      const alive = new Set(entries.map((toast) => toast.key));
      for (const key of aliveIds.current) {
        if (!alive.has(key)) {
          elements.release(key);
        }
      }
      aliveIds.current = alive;
    },
    [entries, order, elements, visible, gap]
  );

  return { measureRef: elements.getRef };
}

export { useStack };
