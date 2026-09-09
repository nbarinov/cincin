type PointerGesture = {
  active(): boolean;
  pointerdown(): void;
  pointerup(): void;
  pointercancel(): void;
};

/**
 * The window in which a focus change belongs to the pointer: from a
 * pointerdown to just past its pointerup. "Just past" because touch
 * fires its mouse compatibility events, the focusing mousedown among
 * them, after pointerup in the same task; a zero timer closes the
 * window once that task is over. A mouse focuses on mousedown, well
 * inside the window either way.
 */
function createPointerGesture(): PointerGesture {
  let active = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const end = (): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      active = false;
    }, 0);
  };

  return {
    active: () => active,
    pointerdown() {
      clearTimeout(timer);
      timer = undefined;
      active = true;
    },
    pointerup: end,
    pointercancel: end,
  };
}

export { createPointerGesture };
export type { PointerGesture };
