import type { Toaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import type { Presenter, PresenterOptions } from 'cincin/presenter';
import * as React from 'react';

/**
 * A presenter over the given toaster, alive as long as the component:
 * mounted on commit, unmounted on cleanup (StrictMode's double effect
 * is countered by the presenter's mount counting). The toaster is read
 * once, like a query client: remount to switch. Options stay live and
 * land before paint (the layout effect, like the stack's): a raised
 * max promotes in the same frame.
 */
function usePresenter<ToastContent extends {} = string>(
  toaster: Toaster<ToastContent>,
  options?: PresenterOptions
): Presenter<ToastContent> {
  const { max, exitDuration } = options ?? {};

  const resolvedOptions = React.useMemo<PresenterOptions>(
    () => ({ max, exitDuration }),
    [max, exitDuration]
  );

  const [presenter] = React.useState(() =>
    createPresenter(toaster, resolvedOptions)
  );

  React.useEffect(() => {
    presenter.mount();

    return () => presenter.unmount();
  }, [presenter]);

  React.useLayoutEffect(() => {
    presenter.setOptions(resolvedOptions);
  }, [presenter, resolvedOptions]);

  return presenter;
}

export { usePresenter };
