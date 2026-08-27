import type { Toast, Presenter } from 'cincin/presenter';
import { onScopeDispose, shallowRef } from 'vue';
import type { Ref } from 'vue';

function useToasts<Content extends {}>(
  presenter: Presenter<Content>
): Readonly<Ref<ReadonlyArray<Toast<Content>>>> {
  const toasts = shallowRef(presenter.getSnapshot());

  // On the server there is nothing to observe: the snapshot stays the
  // initial one, and no subscription is left behind after the render.
  if (typeof window !== 'undefined') {
    onScopeDispose(
      presenter.subscribe(() => {
        toasts.value = presenter.getSnapshot();
      })
    );
  }

  return toasts;
}

export { useToasts };
