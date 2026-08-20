import type { Toast, Presenter } from 'cincin/presenter';
import { useSyncExternalStore } from 'react';
import { getServerSnapshot } from '../shared/ssr';

function useToasts<Content extends {}>(
  presenter: Presenter<Content>
): ReadonlyArray<Toast<Content>> {
  return useSyncExternalStore(
    presenter.subscribe,
    presenter.getSnapshot,
    getServerSnapshot
  );
}

export { useToasts };
