import type { Presenter, Toast, ToastKey } from 'cincin/presenter';
import { createSignal, onCleanup } from 'solid-js';
import { isServer } from 'solid-js/web';
import type { Accessor } from 'solid-js';

type ProjectedToast<Content extends {}> = {
  readonly key: ToastKey;
  /** The live toast: the item's own signal, set per event. */
  readonly toast: Accessor<Toast<Content>>;
};

/**
 * The presenter's push half, materialized the way Solid wants it:
 * stable identities with per-entity updates. The list is seeded from
 * the snapshot and then follows the event channel — `entered` appends
 * an item (snapshot order is entry order), `updated`/`leaving` set
 * that one item's signal, `left` drops it. No diffing anywhere: the
 * core already named the change. Items are stable per key, so a
 * `<For>` over the list keeps a card's DOM through phase flips, and a
 * toast A update never touches card B.
 */
function createToastProjection<Content extends {}>(
  presenter: Presenter<Content>
): Accessor<ReadonlyArray<ProjectedToast<Content>>> {
  const setters = new Map<ToastKey, (toast: Toast<Content>) => void>();

  const project = (toast: Toast<Content>): ProjectedToast<Content> => {
    const [live, setLive] = createSignal(toast);
    setters.set(toast.key, (next) => setLive(next));

    return { key: toast.key, toast: live };
  };

  const [list, setList] = createSignal<ReadonlyArray<ProjectedToast<Content>>>(
    presenter.getSnapshot().map(project)
  );

  if (isServer) {
    return list;
  }

  onCleanup(
    presenter.subscribe((event) => {
      if (event.type === 'entered') {
        const item = project(event.toast);
        setList((current) => [...current, item]);

        return;
      }

      if (event.type === 'updated' || event.type === 'leaving') {
        setters.get(event.toast.key)?.(event.toast);

        return;
      }

      if (event.type === 'left') {
        setters.delete(event.toast.key);
        setList((current) =>
          current.filter((item) => item.key !== event.toast.key)
        );

        return;
      }
    })
  );

  return list;
}

export { createToastProjection };
export type { ProjectedToast };
