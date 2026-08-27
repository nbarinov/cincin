import type { Presenter } from 'cincin/presenter';
import { attachVisibilityPause } from 'cincin/dom';
import { onMounted, onUnmounted } from 'vue';

/**
 * Freezes the presenter's clocks while the document is hidden. Lifetime
 * follows the component: attach on mount, detach (and thaw) on unmount.
 */
function useVisibilityPause<Content extends {}>(
  presenter: Presenter<Content>
): void {
  let detach: (() => void) | undefined;

  onMounted(() => {
    detach = attachVisibilityPause(presenter);
  });

  onUnmounted(() => {
    detach?.();
    detach = undefined;
  });
}

export { useVisibilityPause };
