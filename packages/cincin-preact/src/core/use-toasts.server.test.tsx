// @vitest-environment node

import { createToaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import { renderToString } from 'preact-render-to-string';
import { useToasts } from './use-toasts';
import { EMPTY_SNAPSHOT } from '../shared/ssr';

describe('useToasts on the server', () => {
  it('should render the shared empty snapshot', () => {
    const toaster = createToaster();
    const presenter = createPresenter(toaster);
    presenter.mount();
    toaster.message('created before hydration');

    let seen: ReadonlyArray<unknown> | undefined;
    function Probe() {
      seen = useToasts(presenter);
      return null;
    }

    renderToString(<Probe />);

    expect(seen).toBe(EMPTY_SNAPSHOT);
    presenter.unmount();
  });
});
