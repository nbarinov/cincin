import { createToaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import { createRoot } from 'solid-js';
import { createToastProjection } from './projection';

/** The projection under an owner, over a mounted presenter. */
function setup() {
  return createRoot((dispose) => {
    const toaster = createToaster();
    const presenter = createPresenter(toaster);
    presenter.mount();
    const projection = createToastProjection(presenter);

    return { toaster, presenter, projection, dispose };
  });
}

describe('createToastProjection', () => {
  it('should append on entered and drop on left, in snapshot order', () => {
    const { toaster, presenter, projection, dispose } = setup();

    toaster.message('one');
    toaster.message('two');

    expect(projection().map((item) => item.toast().entry.content)).toEqual([
      'one',
      'two',
    ]);
    expect(projection().map((item) => item.key)).toEqual(
      presenter.getSnapshot().map((toast) => toast.key)
    );

    const [first] = projection();
    presenter.dismiss(first!.key);
    presenter.finish(first!.key);

    expect(projection().map((item) => item.toast().entry.content)).toEqual([
      'two',
    ]);

    dispose();
  });

  it('should route updates into the item signal and keep the list identity', () => {
    const { presenter, toaster, projection, dispose } = setup();

    toaster.message('stay');
    const item = projection()[0]!;
    const listBefore = projection();

    presenter.dismiss(item.key);

    // A phase flip is the item's affair: the list identity holds, so a
    // `<For>` over it never rebuilds the card's DOM.
    expect(projection()).toBe(listBefore);
    expect(projection()[0]).toBe(item);
    expect(item.toast().phase).toBe('leaving');

    dispose();
  });

  it('should mirror the event channel to the snapshot on every step', () => {
    const { toaster, presenter, projection, dispose } = setup();

    const sync = () =>
      expect(projection().map((item) => item.toast())).toEqual(
        presenter.getSnapshot()
      );

    toaster.message('a');
    sync();
    const id = toaster.message('b');
    sync();
    toaster.update(id, { content: 'b2' });
    sync();
    presenter.dismiss();
    sync();

    // The final unmount drops every toast through `left` events: the
    // projection must land empty with it.
    presenter.unmount();
    sync();
    expect(projection()).toEqual([]);

    dispose();
  });

  it('should seed from a presenter that already shows toasts', () => {
    const { presenter, dispose } = createRoot((disposeHost) => {
      const toaster = createToaster();
      const hostPresenter = createPresenter(toaster);
      hostPresenter.mount();
      toaster.message('early');

      return { presenter: hostPresenter, dispose: disposeHost };
    });

    createRoot((disposeProjection) => {
      const projection = createToastProjection(presenter);

      expect(projection().map((item) => item.toast())).toEqual(
        presenter.getSnapshot()
      );

      disposeProjection();
    });

    presenter.unmount();
    dispose();
  });
});
