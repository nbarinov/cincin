import { createPresenterHolder } from 'cincin/presenter';
import type { Presenter, PresenterHolder } from 'cincin/presenter';

function usePresenterHolder(presenter: Presenter<{}>): PresenterHolder {
  return createPresenterHolder(presenter);
}

export { usePresenterHolder };
