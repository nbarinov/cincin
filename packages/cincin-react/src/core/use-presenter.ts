import type { Toaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import type { Presenter, PresenterConfig } from 'cincin/presenter';
import { useEffect, useState } from 'react';

/**
 * A presenter that lives as long as the component: created once on the
 * first render (the toaster and config are read then; remount to
 * switch), mounted on commit, unmounted on cleanup. StrictMode's double
 * effect mounts twice and unmounts once; the presenter counts mounts,
 * so the region keeps showing.
 */
function usePresenter<ToastContent extends {} = string>(
  toaster: Toaster<ToastContent>,
  config?: PresenterConfig
): Presenter<ToastContent> {
  const [presenter] = useState(() => createPresenter(toaster, config));

  useEffect(() => {
    presenter.mount();

    return () => presenter.unmount();
  }, [presenter]);

  return presenter;
}

export { usePresenter };
