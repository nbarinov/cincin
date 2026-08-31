import type { Toast, Presenter } from 'cincin/presenter';
import * as React from 'react';
import { getServerSnapshot } from '../shared/ssr';

function useToasts<Content extends {}>(
  presenter: Presenter<Content>
): ReadonlyArray<Toast<Content>> {
  return React.useSyncExternalStore(
    presenter.subscribe,
    presenter.getSnapshot,
    getServerSnapshot
  );
}

export { useToasts };
