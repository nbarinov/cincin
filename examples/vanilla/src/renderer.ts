import { attachSwipe } from 'cincin/dom';
import { createPresenter } from 'cincin/presenter';
import type { Toaster } from 'cincin';
import type { Toast, ToastKey } from 'cincin/presenter';

const GAP = 12;
const VISIBLE = 3;
const MAX = 5;
const COLLAPSE_DELAY = 200;

interface MountedToast {
  element: HTMLLIElement;
  content: HTMLParagraphElement;
  close: HTMLButtonElement;
  dismissible: boolean;
  detachSwipe: (() => void) | undefined;
}

function mountToastRegion(toaster: Toaster, region: HTMLElement): () => void {
  const presenter = createPresenter(toaster, { max: MAX });
  const mounted = new Map<ToastKey, MountedToast>();

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

    // The regular exit is a CSS transition. It plays while the toast is
    // leaving, unless the fling owns the exit (data-swipe-direction).
    element.addEventListener('transitionend', (event) => {
      if (
        event.target === element &&
        event.propertyName === 'transform' &&
        element.dataset.phase === 'leaving' &&
        !element.hasAttribute('data-swipe-direction')
      ) {
        presenter.finish(key);
      }
    });

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
  };

  const controller = new AbortController();
  const { signal } = controller;

  let collapseTimer: ReturnType<typeof setTimeout> | undefined;
  let interacting = false;

  const expand = () => {
    clearTimeout(collapseTimer);
    collapseTimer = undefined;
    region.dataset.expanded = 'true';
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
      presenter.resume();
    }, COLLAPSE_DELAY);
  };
  region.dataset.expanded = 'false';
  region.addEventListener('mouseenter', expand, { signal });
  // mousemove re-arms the expansion: boundary events can get lost when
  // the hovered toast is removed from under the pointer.
  region.addEventListener('mousemove', expand, { signal });
  region.addEventListener('mouseleave', collapse, { signal });
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

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const unsubscribe = presenter.subscribe((event) => {
    // Mirrors the swipe controller's reduced-motion path: without an
    // exit transition there is no transitionend to wait for, so the
    // exit completes right away. Swiped toasts are skipped: the
    // controller already reports their finish itself. The microtask
    // keeps the finish out of the current notification pass.
    if (
      event.type === 'leaving' &&
      reducedMotion.matches &&
      !mounted
        .get(event.toast.key)
        ?.element.hasAttribute('data-swipe-direction')
    ) {
      const key = event.toast.key;
      queueMicrotask(() => presenter.finish(key));
    }

    render();
  });
  presenter.mount();
  render();

  return () => {
    unsubscribe();
    clearTimeout(collapseTimer);
    controller.abort();
    delete region.dataset.expanded;

    for (const [key, card] of mounted) {
      dropCard(key, card);
    }

    presenter.unmount();
  };
}

export { mountToastRegion };
