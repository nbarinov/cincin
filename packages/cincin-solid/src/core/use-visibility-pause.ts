import type { PresenterHolder } from 'cincin/presenter';
import { attachVisibilityPause } from 'cincin/dom';
import { onCleanup, onMount } from 'solid-js';

/**
 * Holds the presenter's clocks while the document is hidden. Lifetime
 * follows the component: attach on mount, detach (and release) on
 * cleanup.
 */
function useVisibilityPause(holder: PresenterHolder): void {
  onMount(() => {
    onCleanup(attachVisibilityPause(holder));
  });
}

export { useVisibilityPause };
