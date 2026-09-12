import type { PresenterHolder } from 'cincin/presenter';
import { attachVisibilityPause } from 'cincin/dom';
import { DestroyRef, afterNextRender, inject } from '@angular/core';

function injectVisibilityPause(holder: PresenterHolder): void {
  const destroy = inject(DestroyRef);

  afterNextRender(() => {
    destroy.onDestroy(attachVisibilityPause(holder));
  });
}

export { injectVisibilityPause };
