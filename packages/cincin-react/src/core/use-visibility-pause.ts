import type { PresenterHolder } from 'cincin/presenter';
import { attachVisibilityPause } from 'cincin/dom';
import * as React from 'react';

function useVisibilityPause(holder: PresenterHolder): void {
  React.useEffect(
    function setup() {
      return attachVisibilityPause(holder);
    },
    [holder]
  );
}

export { useVisibilityPause };
