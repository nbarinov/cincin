import type { Toast, Presenter } from 'cincin/presenter';
import type { Accessor } from 'solid-js';
import { createSnapshotAccessor } from '../shared/snapshot-accessor';

function useToasts<Content extends {}>(
  presenter: Presenter<Content>
): Accessor<ReadonlyArray<Toast<Content>>> {
  return createSnapshotAccessor(presenter);
}

export { useToasts };
