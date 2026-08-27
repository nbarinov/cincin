import type { Toaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import type { Presenter, PresenterOptions } from 'cincin/presenter';
import { onMounted, onUnmounted, toValue, watchPostEffect } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

/**
 * A presenter over the given toaster, alive as long as the component:
 * mounted on mount, unmounted on unmount. The toaster is read once,
 * like a query client: remount to switch. Options stay live through a
 * ref or getter and land after the DOM patch, before paint (the post
 * flush, like the stack's): a raised max promotes in the same frame.
 */
function usePresenter<ToastContent extends {} = string>(
  toaster: Toaster<ToastContent>,
  options?: MaybeRefOrGetter<PresenterOptions>
): Presenter<ToastContent> {
  const presenter = createPresenter(toaster, toValue(options) ?? {});

  onMounted(presenter.mount);
  onUnmounted(presenter.unmount);

  watchPostEffect(() => {
    presenter.setOptions(toValue(options) ?? {});
  });

  return presenter;
}

export { usePresenter };
