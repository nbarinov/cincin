import { createToaster } from '../core/toaster';
import { createPresenterHolder, createPresenter } from '../presenter';
import { attachVisibilityPause } from './attach-visibility-pause';
import type { Toaster } from '../core/types';
import type { PresenterHolder, Presenter } from '../presenter';

/** A mounted presenter over a fresh toaster, with its holder. */
function setup(): { t: Toaster; p: Presenter; holder: PresenterHolder } {
  const t = createToaster();
  const p = createPresenter(t);
  p.mount();
  return { t, p, holder: createPresenterHolder(p) };
}

const detachers: Array<() => void> = [];

function attach(holder: PresenterHolder): () => void {
  const detach = attachVisibilityPause(holder);
  detachers.push(detach);
  return detach;
}

/** Swaps `document.visibilityState` and fires the transition event. */
function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

const pausedFlags = (p: Presenter) => p.getSnapshot().map((x) => x.paused);

afterEach(() => {
  while (detachers.length > 0) {
    detachers.pop()!();
  }
  // Restore the prototype getter jsdom provides.
  delete (document as { visibilityState?: unknown }).visibilityState;
});

// The freeze itself is the holder's and is tested there; this
// suite covers the source: what the document's visibility reports.
describe('attachVisibilityPause', () => {
  it('should hold when the document hides and release when it shows', () => {
    const { t, p, holder } = setup();
    t.message('a');
    attach(holder);

    setVisibility('hidden');
    expect(holder.held()).toBe(true);
    expect(pausedFlags(p)).toEqual([true]);

    setVisibility('visible');
    expect(holder.held()).toBe(false);
    expect(pausedFlags(p)).toEqual([false]);
  });

  it('should hold right away when attached into a hidden document', () => {
    const { holder } = setup();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });

    attach(holder);

    expect(holder.held()).toBe(true);
  });

  it('should leave another source holding when the document shows', () => {
    const { holder } = setup();
    holder.hold('viewport');
    attach(holder);

    setVisibility('hidden');
    setVisibility('visible');

    expect(holder.held()).toBe(true);
  });

  it('should release and stop listening on detach', () => {
    const { holder } = setup();
    const detach = attach(holder);

    setVisibility('hidden');
    expect(holder.held()).toBe(true);

    detach();
    expect(holder.held()).toBe(false);

    setVisibility('hidden');
    expect(holder.held()).toBe(false);
  });
});
