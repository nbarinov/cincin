import { createPresenterHolder } from 'cincin/presenter';
import type { Presenter, PresenterHolder } from 'cincin/presenter';

/** The family's spelling of `createPresenterHolder`: a holder has no
 * lifecycle of its own, so nothing is injected here. */
function injectPresenterHolder(presenter: Presenter<{}>): PresenterHolder {
  return createPresenterHolder(presenter);
}

export { injectPresenterHolder };
