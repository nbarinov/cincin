import { observeTextDirection, textDirection } from 'cincin/dom';
import { useSyncExternalStore } from './use-sync-external-store';

/**
 * The document root's text direction as a live subscription: the
 * dir-aware position default must follow an imperative `dir` flip on
 * the root (a locale switch is not obliged to re-render the Toaster).
 * The root is this hook's choice; the dom helpers take any element.
 * The server snapshot is 'ltr' by contract (no getSnapshot runs
 * there), so SSR and hydration agree; an RTL page settles right after
 * mount (pass an explicit `position` to avoid the flip entirely).
 */
function useDocumentDirection(): 'ltr' | 'rtl' {
  return useSyncExternalStore(subscribe, getDirection, serverDirection);
}

export { useDocumentDirection };

// utils

function subscribe(onChange: () => void): () => void {
  return observeTextDirection(document.documentElement, onChange);
}

function getDirection(): 'ltr' | 'rtl' {
  return textDirection(document.documentElement);
}

function serverDirection(): 'ltr' {
  return 'ltr';
}
