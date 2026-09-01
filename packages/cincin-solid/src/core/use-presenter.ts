import type { Toaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import type { Presenter, PresenterOptions } from 'cincin/presenter';
import { createRenderEffect, onCleanup, onMount } from 'solid-js';
import { access } from '../shared/maybe-accessor';
import type { MaybeAccessor } from '../shared/maybe-accessor';

/**
 * A presenter over the given toaster, alive as long as the component:
 * mounted on mount, unmounted on cleanup (the pair rides inside
 * onMount, so a server render that never mounts never unmounts
 * either). The toaster is read once, like a query client: remount to
 * switch. Options stay live through a getter and land in the render
 * phase, before paint: a raised max promotes in the same frame.
 */
function usePresenter<ToastContent extends {} = string>(
  toaster: Toaster<ToastContent>,
  options?: MaybeAccessor<PresenterOptions>
): Presenter<ToastContent> {
  const presenter = createPresenter(toaster, access(options) ?? {});

  onMount(() => {
    presenter.mount();
    onCleanup(presenter.unmount);
  });

  createRenderEffect(() => {
    presenter.setOptions(access(options) ?? {});
  });

  return presenter;
}

export { usePresenter };
