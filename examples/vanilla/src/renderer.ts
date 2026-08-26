import { attachSwipe, attachVisibilityPause } from 'cincin/dom';
import { createPresenter } from 'cincin/presenter';
import type { Toaster } from 'cincin';
import type { Toast, ToastKey } from 'cincin/presenter';

const GAP = 12;
const VISIBLE = 3;
const MAX = 5;
const COLLAPSE_DELAY = 200;
/** Published as --cincin-exit-duration; the skin's motion rides it. */
const EXIT_DURATION = 400;

interface MountedToast {
  element: HTMLLIElement;
  content: HTMLParagraphElement;
  close: HTMLButtonElement;
  dismissible: boolean;
  detachSwipe: (() => void) | undefined;
}

function mountToastRegion(toaster: Toaster, region: HTMLElement): () => void {
  const presenter = createPresenter(toaster, {
    max: MAX,
    exitDuration: EXIT_DURATION,
  });
  const mounted = new Map<ToastKey, MountedToast>();

  // One value drives the whole exit story: the same number feeds the
  // presenter's exit clock above and, through this variable, every
  // motion duration in the skin. No transitionend listeners anywhere.
  region.style.setProperty('--cincin-exit-duration', `${EXIT_DURATION}ms`);

  const createCard = (key: ToastKey): MountedToast => {
    const element = document.createElement('li');
    element.className = 'toast';

    const content = document.createElement('p');
    content.className = 'toast-content';

    const close = document.createElement('button');
    close.className = 'toast-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '✕';
    // Born matching the card's initial dismissible: false below.
    close.hidden = true;
    close.addEventListener('click', () => presenter.dismiss(key));

    element.append(content, close);

    return {
      element,
      content,
      close,
      dismissible: false,
      detachSwipe: undefined,
    };
  };

  // A non-dismissible toast carries no user-facing closers; the flag can
  // flip on update (a loading toast settling), so the swipe controller
  // attaches and detaches with it, the same way the react hook does.
  const applyDismissible = (key: ToastKey, card: MountedToast, on: boolean) => {
    if (card.dismissible === on) {
      return;
    }

    card.dismissible = on;
    card.close.hidden = !on;

    card.detachSwipe?.();
    card.detachSwipe = on
      ? attachSwipe(card.element, {
          direction: 'right',
          onDismiss: () => presenter.dismiss(key),
          onRemove: () => presenter.finish(key),
        })
      : undefined;
  };

  const dropCard = (key: ToastKey, card: MountedToast) => {
    card.detachSwipe?.();
    card.element.remove();
    mounted.delete(key);
  };

  // Collapsed backs and leaving ghosts are non-interactive: `inert`
  // states it for the tab order and the AT tree in one place, the CSS
  // only paints the same fact. Mirrors the react skin.
  const applyInert = () => {
    const expanded = region.dataset.expanded === 'true';
    const shown = presenter
      .getSnapshot()
      .filter((toast: Toast) => toast.phase !== 'queued');
    const frontKey = shown.findLast((toast) => toast.phase !== 'leaving')?.key;

    for (const toast of shown) {
      const card = mounted.get(toast.key);
      if (card) {
        card.element.inert =
          toast.phase === 'leaving' || (!expanded && toast.key !== frontKey);
      }
    }
  };

  const render = () => {
    const shown = presenter
      .getSnapshot()
      .filter((toast: Toast) => toast.phase !== 'queued');

    for (const [key, card] of mounted) {
      if (!shown.some((toast) => toast.key === key)) {
        dropCard(key, card);
      }
    }

    if (shown.length === 0 && region.dataset.expanded === 'true') {
      // An emptied region has nothing to hover: reset the collapsed
      // state (and the pause that came with it) right away, so the next
      // toast arrives into a fresh stack with a live clock.
      clearTimeout(collapseTimer);
      region.dataset.expanded = 'false';
      presenter.resume();
    }

    // DOM keeps the snapshot order (oldest first) for reading order;
    // the visual stack is driven by --index / --offset / z-index.
    shown.forEach((toast, index) => {
      let card = mounted.get(toast.key);

      if (!card) {
        card = createCard(toast.key);
        mounted.set(toast.key, card);
      }

      card.element.dataset.type = toast.entry.type;
      card.element.dataset.phase = toast.phase;
      card.element.style.zIndex = String(index + 1);
      card.content.textContent = toast.entry.content;
      applyDismissible(toast.key, card, toast.entry.dismissible);

      const anchor = region.children[index] ?? null;
      if (anchor !== card.element) {
        region.insertBefore(card.element, anchor);
      }
    });

    // Second pass, front to back: stack geometry from measured heights.
    // A leaving toast keeps its frozen slot (it exits in place) and
    // vacates it for the rest, so the survivors reflow immediately.
    let offset = 0;
    let depth = 0;
    for (let index = shown.length - 1; index >= 0; index -= 1) {
      const toast = shown[index]!;
      const { element } = mounted.get(toast.key)!;

      if (toast.phase === 'leaving') {
        continue;
      }

      element.dataset.hidden = String(depth >= VISIBLE);
      element.style.setProperty('--index', String(depth));
      element.style.setProperty('--offset', `${offset}px`);
      offset += element.offsetHeight + GAP;
      depth += 1;
    }

    applyInert();
  };

  const controller = new AbortController();
  const { signal } = controller;

  let collapseTimer: ReturnType<typeof setTimeout> | undefined;
  let interacting = false;

  const expand = () => {
    clearTimeout(collapseTimer);
    collapseTimer = undefined;
    if (region.dataset.expanded !== 'true') {
      region.dataset.expanded = 'true';
      applyInert();
    }
    presenter.pause();
  };
  const collapse = () => {
    if (interacting) {
      // Mid-gesture (a swipe drifting off the stack): stay expanded.
      return;
    }

    clearTimeout(collapseTimer);
    collapseTimer = setTimeout(() => {
      region.dataset.expanded = 'false';
      applyInert();
      presenter.resume();
    }, COLLAPSE_DELAY);
  };
  region.dataset.expanded = 'false';
  region.addEventListener('mouseenter', expand, { signal });
  // mousemove re-arms the expansion: boundary events can get lost when
  // the hovered toast is removed from under the pointer.
  region.addEventListener('mousemove', expand, { signal });
  region.addEventListener('mouseleave', collapse, { signal });
  // Focus mirrors hover for the keyboard: tabbing onto the front card's
  // controls opens the stack, the collapsed backs join the tab order.
  region.addEventListener('focusin', expand, { signal });
  region.addEventListener(
    'focusout',
    (event) => {
      if (region.contains(event.relatedTarget as Node | null)) {
        return;
      }

      // A dismissed control drops focus to the body while the pointer
      // still parks on the stack: the hover keeps the region open.
      if (region.matches(':hover')) {
        return;
      }

      collapse();
    },
    { signal }
  );
  region.addEventListener(
    'pointerdown',
    () => {
      interacting = true;
    },
    { signal }
  );
  region.addEventListener(
    'pointerup',
    () => {
      interacting = false;
    },
    { signal }
  );
  region.addEventListener(
    'pointercancel',
    () => {
      interacting = false;
    },
    { signal }
  );
  // iOS Safari emits emulated mouse events only for taps on "clickable"
  // targets: a tap on empty page space fires no mouseleave, and the
  // expanded stack would never collapse. An explicit outside pointerdown
  // covers that deterministically.
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!region.contains(event.target as Node)) {
        collapse();
      }
    },
    { signal }
  );

  const unsubscribe = presenter.subscribe(() => {
    render();
  });
  presenter.mount();

  const detachVisibilityPause = attachVisibilityPause(presenter);
  render();

  return () => {
    detachVisibilityPause();
    unsubscribe();
    clearTimeout(collapseTimer);
    controller.abort();
    delete region.dataset.expanded;
    region.style.removeProperty('--cincin-exit-duration');

    for (const [key, card] of mounted) {
      dropCard(key, card);
    }

    presenter.unmount();
  };
}

export { mountToastRegion };
