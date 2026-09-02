// @vitest-environment node

import { createToaster } from 'cincin';
import { renderToString } from 'preact-render-to-string';
import { useToastEntries } from './use-toast-entries';
import { EMPTY_SNAPSHOT } from '../shared/ssr';

describe('useToastEntries on the server', () => {
  it('should render the shared empty snapshot', () => {
    const toaster = createToaster();
    toaster.message('created before hydration');

    let seen: ReadonlyArray<unknown> | undefined;
    function Probe() {
      seen = useToastEntries(toaster);
      return null;
    }

    renderToString(<Probe />);

    // Not just empty: the very same frozen instance, so hydration
    // compares equal by reference and never reports a mismatch.
    expect(seen).toBe(EMPTY_SNAPSHOT);
    toaster.destroy();
  });
});
