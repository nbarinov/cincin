import type { Presenter } from 'cincin/presenter';
import { attachVisibilityPause } from 'cincin/dom';
import { onCleanup, onMount } from 'solid-js';

/**
 * Freezes the presenter's clocks while the document is hidden. Lifetime
 * follows the component: attach on mount, detach (and thaw) on cleanup.
 */
function useVisibilityPause<Content extends {}>(
  presenter: Presenter<Content>
): void {
  onMount(() => {
    onCleanup(attachVisibilityPause(presenter));
  });
}

export { useVisibilityPause };
