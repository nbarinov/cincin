import { observeTextDirection, textDirection } from 'cincin/dom';
import { onMounted, onUnmounted, shallowRef } from 'vue';
import type { ShallowRef } from 'vue';

/**
 * The document root's text direction as a live subscription: the
 * dir-aware position default must follow an imperative `dir` flip on
 * the root (a locale switch is not obliged to re-render the Toaster).
 * The root is this composable's choice — the dom helpers take any
 * element. The initial value is 'ltr' by contract (nothing touches
 * the DOM before mount), so SSR and hydration agree; an RTL page
 * settles right after mount (pass an explicit `position` to avoid
 * the flip entirely).
 */
function useDocumentDirection(): Readonly<ShallowRef<'ltr' | 'rtl'>> {
  const direction = shallowRef<'ltr' | 'rtl'>('ltr');

  onMounted(() => {
    const root = document.documentElement;
    const sync = () => {
      direction.value = textDirection(root);
    };

    sync();
    onUnmounted(observeTextDirection(root, sync));
  });

  return direction;
}

export { useDocumentDirection };
