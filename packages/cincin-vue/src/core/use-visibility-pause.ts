import type { PresenterHolder } from 'cincin/presenter';
import { attachVisibilityPause } from 'cincin/dom';
import { onMounted, onUnmounted } from 'vue';

/**
 * Holds the presenter's clocks while the document is hidden. Lifetime
 * follows the component: attach on mount, detach (and release) on
 * unmount.
 */
function useVisibilityPause(holder: PresenterHolder): void {
  let detach: (() => void) | undefined;

  onMounted(() => {
    detach = attachVisibilityPause(holder);
  });

  onUnmounted(() => {
    detach?.();
    detach = undefined;
  });
}

export { useVisibilityPause };
