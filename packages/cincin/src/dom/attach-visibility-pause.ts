import type { PresenterHolder } from '../presenter';

/**
 * Holds the presenter while the document is hidden: one name among
 * the holder's, `'hidden'`. The holder keeps the ledger
 * and the overlap with other sources (an open viewport, app code); this
 * attach only reports the document's visibility. Detaching releases
 * the hold and stops listening.
 */
function attachVisibilityPause(holder: PresenterHolder): () => void {
  const id = Symbol('hidden');

  const sync = () => {
    if (document.visibilityState === 'hidden') {
      holder.hold(id);
    } else {
      holder.release(id);
    }
  };

  document.addEventListener('visibilitychange', sync);
  sync();

  return () => {
    document.removeEventListener('visibilitychange', sync);
    holder.release(id);
  };
}

export { attachVisibilityPause };
