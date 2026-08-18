import type { Toast, ToastId } from 'cincin';
import { useLayoutEffect, useRef } from 'react';
import { useRefMap } from '../shared/use-ref-map';

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
  toasts: ReadonlyArray<Pick<Toast, 'id' | 'status'>>,
  options: StackOptions = {}
) {
  const { order = 'stack', visible = 3, gap = 12 } = options;
  const elements = useRefMap<ToastId, HTMLElement>();
  const slots = useRef(new Map<ToastId, ToastSlot>());
  const aliveIds = useRef(new Set<ToastId>());

  useLayoutEffect(
    function layoutStack() {
      const next = new Map<ToastId, ToastSlot>();
      let offset = 0;
      let depth = 0;

      const isStack = order === 'stack';
      const front = isStack ? toasts.length - 1 : 0;
      const step = isStack ? -1 : 1;

      for (let i = front; i >= 0 && i < toasts.length; i += step) {
        const toast = toasts[i]!;
        const element = elements.get(toast.id);

        if (element === undefined) {
          continue;
        }

        const dismissing = toast.status === 'dismissing';
        const slot = dismissing
          ? slots.current.get(toast.id)
          : {
              index: depth,
              offset,
              zIndex: toasts.length - depth,
              hidden: depth >= visible,
            };

        if (slot !== undefined) {
          next.set(toast.id, slot);
          element.style.setProperty('--index', String(slot.index));
          element.style.setProperty('--offset', `${slot.offset}px`);
          element.style.zIndex = String(slot.zIndex);
          element.dataset.hidden = String(slot.hidden);
        }

        if (!dismissing) {
          offset += element.offsetHeight + gap;
          depth += 1;
        }
      }

      slots.current = next;

      // The data pass is the only reliable "truly gone" signal, so the
      // registry entries of departed toasts are released here, never
      // from ref cleanups (those re-run while the toast is alive).
      const alive = new Set(toasts.map((toast) => toast.id));
      for (const id of aliveIds.current) {
        if (!alive.has(id)) {
          elements.release(id);
        }
      }
      aliveIds.current = alive;
    },
    [toasts, order, elements, visible, gap]
  );

  return { measureRef: elements.getRef };
}

export { useStack };
