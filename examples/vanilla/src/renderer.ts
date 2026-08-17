import { attachSwipe } from 'cincin/dom';
import type { ToastId, Toaster } from 'cincin';

const GAP = 12;
const VISIBLE = 3;
const COLLAPSE_DELAY = 200;

interface MountedToast {
  element: HTMLLIElement;
  content: HTMLParagraphElement;
  detachSwipe: () => void;
}

function mountToastRegion(toaster: Toaster, region: HTMLElement): () => void {
  const mounted = new Map<ToastId, MountedToast>();

  const createEntry = (id: ToastId): MountedToast => {
    const element = document.createElement('li');
    element.className = 'toast';

    const content = document.createElement('p');
    content.className = 'toast-content';

    const close = document.createElement('button');
    close.className = 'toast-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '✕';
    close.addEventListener('click', () => toaster.dismiss(id));

    element.append(content, close);

    // The regular exit is a CSS transition. It plays while the toast is
    // dismissing, unless the fling owns the exit (data-swipe-direction).
    element.addEventListener('transitionend', (event) => {
      if (
        event.target === element &&
        event.propertyName === 'transform' &&
        element.dataset.status === 'dismissing' &&
        !element.hasAttribute('data-swipe-direction')
      ) {
        toaster.remove(id);
      }
    });

    const detachSwipe = attachSwipe(element, {
      direction: 'right',
      onDismiss: () => toaster.dismiss(id),
      onRemove: () => toaster.remove(id),
    });

    return { element, content, detachSwipe };
  };

  const dropEntry = (id: ToastId, entry: MountedToast) => {
    entry.detachSwipe();
    entry.element.remove();
    mounted.delete(id);
  };

  const render = () => {
    const visible = toaster
      .getSnapshot()
      .filter((toast) => toast.status !== 'queued');

    for (const [id, entry] of mounted) {
      if (!visible.some((toast) => toast.id === id)) {
        dropEntry(id, entry);
      }
    }

    if (visible.length === 0 && region.dataset.expanded === 'true') {
      // An emptied region has nothing to hover: reset the collapsed
      // state (and the pause that came with it) right away, so the next
      // toast arrives into a fresh stack with a live timer.
      clearTimeout(collapseTimer);
      region.dataset.expanded = 'false';
      toaster.resume();
    }

    // DOM keeps the snapshot order (oldest first) for reading order;
    // the visual stack is driven by --index / --offset / z-index.
    visible.forEach((toast, index) => {
      let entry = mounted.get(toast.id);

      if (!entry) {
        entry = createEntry(toast.id);
        mounted.set(toast.id, entry);
      }

      entry.element.dataset.type = toast.type;
      entry.element.dataset.status = toast.status;
      entry.element.style.zIndex = String(index + 1);
      entry.content.textContent = toast.content;

      const anchor = region.children[index] ?? null;
      if (anchor !== entry.element) {
        region.insertBefore(entry.element, anchor);
      }
    });

    // Second pass, front to back: stack geometry from measured heights.
    // A dismissing toast keeps its frozen slot (it exits in place) and
    // vacates it for the rest, so the survivors reflow immediately.
    let offset = 0;
    let depth = 0;
    for (let index = visible.length - 1; index >= 0; index -= 1) {
      const toast = visible[index]!;
      const { element } = mounted.get(toast.id)!;

      if (toast.status === 'dismissing') {
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
    toaster.pause();
  };
  const collapse = () => {
    if (interacting) {
      // Mid-gesture (a swipe drifting off the stack): stay expanded.
      return;
    }

    clearTimeout(collapseTimer);
    collapseTimer = setTimeout(() => {
      region.dataset.expanded = 'false';
      toaster.resume();
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

  const unsubscribe = toaster.subscribe((event) => {
    // Mirrors the swipe controller's reduced-motion path: without an
    // exit transition there is no transitionend to wait for, so the
    // dismissal completes right away. Swiped toasts are skipped: the
    // controller already reports their removal itself. The microtask
    // keeps the remove out of the current notification pass.
    if (
      event.type === 'dismissed' &&
      reducedMotion.matches &&
      !mounted.get(event.toast.id)?.element.hasAttribute('data-swipe-direction')
    ) {
      queueMicrotask(() => toaster.remove(event.toast.id));
    }

    render();
  });
  render();

  return () => {
    unsubscribe();
    clearTimeout(collapseTimer);
    controller.abort();
    delete region.dataset.expanded;

    for (const [id, entry] of mounted) {
      dropEntry(id, entry);
    }
  };
}

export { mountToastRegion };
