import type { Presenter } from 'cincin/presenter';
import { attachVisibilityPause } from 'cincin/dom';
import * as React from 'react';

/**
 * Freezes the presenter's clocks while the document is hidden. Lifetime
 * follows the component: attach on mount, detach (and thaw) on unmount.
 */
function useVisibilityPause<Content extends {}>(
  presenter: Presenter<Content>
): void {
  React.useEffect(
    function setup() {
      return attachVisibilityPause(presenter);
    },
    [presenter]
  );
}

export { useVisibilityPause };
