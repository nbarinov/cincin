import type { Toast, Presenter } from 'cincin/presenter';
import { getServerSnapshot } from '../shared/ssr';
import { useSyncExternalStore } from '../shared/use-sync-external-store';

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
