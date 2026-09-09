import type { PresenterHolder } from 'cincin/presenter';
import { attachVisibilityPause } from 'cincin/dom';
import { useEffect } from 'preact/hooks';

/**
 * Holds the presenter's clocks while the document is hidden. Lifetime
 * follows the component: attach on mount, detach (and release) on
 * unmount.
 */
function useVisibilityPause(holder: PresenterHolder): void {
  useEffect(
    function setup() {
      return attachVisibilityPause(holder);
    },
    [holder]
  );
}

export { useVisibilityPause };
