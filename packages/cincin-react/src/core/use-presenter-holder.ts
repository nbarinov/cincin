import { createPresenterHolder } from 'cincin/presenter';
import type { Presenter, PresenterHolder } from 'cincin/presenter';
import * as React from 'react';

function usePresenterHolder(presenter: Presenter<{}>): PresenterHolder {
  const [holder] = React.useState(() => createPresenterHolder(presenter));

  return holder;
}

export { usePresenterHolder };
