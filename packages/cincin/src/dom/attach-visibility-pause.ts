import type { Presenter, ToastKey } from '../presenter';

function attachVisibilityPause<Content extends {}>(
  presenter: Presenter<Content>
): () => void {
  const owned = new Set<ToastKey>();
  let unsubscribe: (() => void) | undefined;

  const freeze = () => {
    const toasts = presenter.getSnapshot();

    for (const toast of toasts) {
      if (toast.phase !== 'leaving' && !toast.paused) {
        owned.add(toast.key);
      }
    }

    unsubscribe?.();
    presenter.pause();

    unsubscribe = presenter.subscribe((e) => {
      if (e.type === 'left') {
        owned.delete(e.toast.key);

        return;
      }

      if (
        e.type === 'entered' ||
        (e.type === 'updated' && e.prev.paused && !e.toast.paused)
      ) {
        owned.add(e.toast.key);
        presenter.pause(e.toast.key);

        return;
      }
    });
  };

  const unfreeze = () => {
    unsubscribe?.();
    unsubscribe = undefined;
    presenter.resume([...owned.values()]);
    owned.clear();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      freeze();
    } else {
      unfreeze();
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);

  if (document.visibilityState === 'hidden') {
    freeze();
  }

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    unfreeze();
  };
}

export { attachVisibilityPause };
