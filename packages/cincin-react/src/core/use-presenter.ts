import type { Toaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import type { Presenter, PresenterConfig } from 'cincin/presenter';
import { useEffect, useMemo, useState } from 'react';

/**
 * A presenter over the given toaster, alive as long as the component:
 * mounted on commit, unmounted on cleanup (StrictMode's double effect
 * is countered by the presenter's mount counting). The toaster is read
 * once, like a query client: remount to switch. Config stays live
 * through setConfig, the way an observer follows its options.
 */
function usePresenter<ToastContent extends {} = string>(
  toaster: Toaster<ToastContent>,
  config?: PresenterConfig
): Presenter<ToastContent> {
  const { max, removeTimeout } = config ?? {};

  const resolvedConfig = useMemo<PresenterConfig>(
    () => ({
      ...(max !== undefined && { max }),
      ...(removeTimeout !== undefined && { removeTimeout }),
    }),
    [max, removeTimeout]
  );

  const [presenter] = useState(() => createPresenter(toaster, resolvedConfig));

  useEffect(() => {
    presenter.mount();

    return () => presenter.unmount();
  }, [presenter]);

  useEffect(() => {
    presenter.setConfig(resolvedConfig);
  }, [presenter, resolvedConfig]);

  return presenter;
}

export { usePresenter };
