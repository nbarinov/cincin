import { observeTextDirection, textDirection } from 'cincin/dom';
import { createSignal, onCleanup, onMount } from 'solid-js';
import type { Accessor } from 'solid-js';

/**
 * The document root's text direction as a live subscription: the
 * dir-aware position default must follow an imperative `dir` flip on
 * the root (a locale switch is not obliged to re-render the Toaster).
 * The root is this primitive's choice — the dom helpers take any
 * element. The initial value is 'ltr' by contract (nothing touches
 * the DOM before mount), so SSR and hydration agree; an RTL page
 * settles right after mount (pass an explicit `position` to avoid
 * the flip entirely).
 */
function useDocumentDirection(): Accessor<'ltr' | 'rtl'> {
  const [direction, setDirection] = createSignal<'ltr' | 'rtl'>('ltr');

  onMount(() => {
    const root = document.documentElement;
    const sync = () => setDirection(textDirection(root));

    sync();
    onCleanup(observeTextDirection(root, sync));
  });

  return direction;
}

export { useDocumentDirection };
