import { observeTextDirection, textDirection } from 'cincin/dom';
import { DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import type { Signal } from '@angular/core';

/**
 * The document root's text direction as a live subscription: the
 * dir-aware position default must follow an imperative `dir` flip on
 * the root (a locale switch is not obliged to re-render the Toaster).
 * The root is this function's choice; the dom helpers take any
 * element. The initial value is 'ltr' by contract (nothing touches
 * the DOM before the first render), so SSR and hydration agree; an
 * RTL page settles right after mount (pass an explicit `position` to
 * avoid the flip entirely).
 */
function injectDocumentDirection(): Signal<'ltr' | 'rtl'> {
  const direction = signal<'ltr' | 'rtl'>('ltr');
  const destroy = inject(DestroyRef);

  afterNextRender(() => {
    const root = document.documentElement;
    const sync = () => {
      direction.set(textDirection(root));
    };

    sync();
    destroy.onDestroy(observeTextDirection(root, sync));
  });

  return direction.asReadonly();
}

export { injectDocumentDirection };
