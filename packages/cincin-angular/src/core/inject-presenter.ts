import type { Toaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import type { Presenter, PresenterOptions } from 'cincin/presenter';
import { DestroyRef, afterNextRender, effect, inject } from '@angular/core';
import { read } from './maybe-signal';
import type { MaybeSignal } from './maybe-signal';

/**
 * A presenter over the given toaster, alive as long as the injection
 * context: mounted after the first render (browser only, so a server
 * render never mounts and never unmounts either), unmounted on destroy.
 * The toaster is read once, like a query client: recreate to switch.
 * Options stay live through a signal or getter and land during change
 * detection, before paint: a raised max promotes in the same frame.
 */
function injectPresenter<ToastContent extends {} = string>(
  toaster: Toaster<ToastContent>,
  options?: MaybeSignal<PresenterOptions>
): Presenter<ToastContent> {
  const presenter = createPresenter(toaster, options && read(options));
  const destroy = inject(DestroyRef);

  afterNextRender(() => {
    presenter.mount();
    destroy.onDestroy(presenter.unmount);
  });

  effect(() => {
    presenter.setOptions(options === undefined ? {} : read(options));
  });

  return presenter;
}

export { injectPresenter };
