import { createPresenterHolder } from 'cincin/presenter';
import type { Presenter, PresenterHolder } from 'cincin/presenter';
import { useState } from 'preact/hooks';

function usePresenterHolder(presenter: Presenter<{}>): PresenterHolder {
  const [holder] = useState(() => createPresenterHolder(presenter));

  return holder;
}

export { usePresenterHolder };
