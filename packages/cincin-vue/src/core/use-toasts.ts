import type { Toast, Presenter } from 'cincin/presenter';
import type { Ref } from 'vue';
import { useSnapshot } from '../shared/use-snapshot';

function useToasts<Content extends {}>(
  presenter: Presenter<Content>
): Readonly<Ref<ReadonlyArray<Toast<Content>>>> {
  return useSnapshot(presenter);
}

export { useToasts };
