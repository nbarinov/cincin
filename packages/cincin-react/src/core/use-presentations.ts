import type { Presentation, Presenter } from 'cincin/presenter';
import { useSyncExternalStore } from 'react';
import { getServerSnapshot } from '../shared/ssr';

function usePresentations<ToastContent extends {}>(
  presenter: Presenter<ToastContent>
): ReadonlyArray<Presentation<ToastContent>> {
  return useSyncExternalStore(
    presenter.subscribe,
    presenter.getSnapshot,
    getServerSnapshot
  );
}

export { usePresentations };
