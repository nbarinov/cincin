import {
  attachSwipe,
  attachViewport,
  attachVisibilityPause,
  createSlotObserver,
  createStackLayout,
  createViewportController,
} from 'cincin/dom';
import { createPresenter, createPresenterHolder } from 'cincin/presenter';
import type { Toaster } from 'cincin';
import type { StackSlot } from 'cincin/dom';
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
  unobserve: () => void;
  unsubscribe: () => void;
}

function mountToastRegion(toaster: Toaster, region: HTMLElement): () => void {
  const presenter = createPresenter(toaster, {
    max: MAX,
    exitDuration: EXIT_DURATION,
  });
  // The stack's geometry engine: it measures the cards (the card box
  // itself here, this skin keeps natural heights) and publishes a slot
  // per key; the subscriptions below put the slots onto the cards.
  const layout = createStackLayout({
    visible: VISIBLE,
    gap: GAP,
    body: (card) => card,
  });
  const mounted = new Map<ToastKey, MountedToast>();
  // The stack's attention: open under the pointer or focus, folded a
  // delay after both leave. The machine publishes `expanded`; the
  // subscription below writes it to the region and holds the presenter
  // while open. The listeners come from `attachViewport`.
  const viewport = createViewportController({ collapseDelay: COLLAPSE_DELAY });

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

    // The card applies its slot on itself, in the CSS protocol's
    // vocabulary (docs/protocol.md): geometry as variables, the
    // tri-state front shedding the attribute on a leaving ghost, and
    // semantics (`inert`) straight from the data. A swept slot needs no
    // cleanup: the card leaves the DOM with it.
    const observer = createSlotObserver(layout, { key });
    const unobserve = observer.observe(element);
    const unsubscribe = observer.subscribe((slot) => {
      if (slot === undefined) {
        return;
      }

      element.style.setProperty('--cincin-toast-index', String(slot.index));
      element.style.setProperty('--cincin-toast-offset', `${slot.offset}px`);
      element.style.zIndex = String(slot.zIndex);
      if (slot.height !== undefined) {
        element.style.setProperty('--cincin-toast-height', `${slot.height}px`);
      }
      if (slot.frontHeight !== undefined) {
        element.style.setProperty(
          '--cincin-front-height',
          `${slot.frontHeight}px`
        );
      }
      element.dataset.hidden = String(slot.hidden);
      if (slot.leaving) {
        delete element.dataset.front;
      } else {
        element.dataset.front = String(slot.front);
      }

      applyInert(element, slot);
    });

    return {
      element,
      content,
      close,
      dismissible: false,
      detachSwipe: undefined,
      unobserve,
      unsubscribe,
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
          onDismiss: () => presenter.dismiss(key),
          onRemove: () => presenter.finish(key),
        })
      : undefined;
  };

  const dropCard = (key: ToastKey, card: MountedToast) => {
    card.detachSwipe?.();
    card.unsubscribe();
    card.unobserve();
    card.element.remove();
    mounted.delete(key);
  };

  // Collapsed backs and leaving ghosts are non-interactive: `inert`
  // states it for the tab order and the AT tree in one place, the CSS
  // only paints the same fact. The rule reads the layout's slot, so
  // the front marker comes with its exclusivity guarantees. Mirrors
  // the react skin.
  const applyInert = (element: HTMLElement, slot: StackSlot | undefined) => {
    const expanded = viewport.getSnapshot();
    element.inert =
      slot === undefined || slot.leaving || (!expanded && !slot.front);
  };

  // Expansion is region state the slots know nothing about: on a flip,
  // re-run the rule over the mounted cards with their current slots.
  const applyInertAll = () => {
    for (const [key, card] of mounted) {
      applyInert(card.element, layout.getSlot(key));
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

    if (presenter.count() === 0) {
      // An emptied viewport ends the hover: no mouseleave arrives for a
      // stack that vanished under the pointer.
      viewport.hover(false);
    }

    // DOM keeps the snapshot order (oldest first) for reading order;
    // the visual stack is the layout's business: the entries mirror
    // below hands it the composition, and each card's subscription
    // puts the resulting slot onto its element.
    shown.forEach((toast, index) => {
      let card = mounted.get(toast.key);

      if (!card) {
        card = createCard(toast.key);
        mounted.set(toast.key, card);
      }

      card.element.dataset.type = toast.entry.type;
      card.element.dataset.phase = toast.phase;
      card.content.textContent = toast.entry.content;
      applyDismissible(toast.key, card, toast.entry.dismissible);

      const anchor = region.children[index] ?? null;
      if (anchor !== card.element) {
        region.insertBefore(card.element, anchor);
      }
    });

    layout.setEntries(
      shown.map((toast) => ({
        key: toast.key,
        leaving: toast.phase === 'leaving',
      }))
    );
  };

  const controller = new AbortController();
  const { signal } = controller;

  const holder = createPresenterHolder(presenter);

  region.dataset.expanded = 'false';
  const unsubscribeViewport = viewport.subscribe((expanded) => {
    region.dataset.expanded = String(expanded);
    applyInertAll();

    if (expanded) {
      holder.hold('viewport');
    } else {
      holder.release('viewport');
    }
  });
  attachViewport(region, viewport, { signal });

  const unsubscribe = presenter.subscribe(() => {
    render();
  });
  presenter.mount();

  const detachVisibilityPause = attachVisibilityPause(holder);
  render();

  return () => {
    detachVisibilityPause();
    unsubscribe();
    controller.abort();
    unsubscribeViewport();
    viewport.destroy();
    holder.release('viewport');
    delete region.dataset.expanded;
    region.style.removeProperty('--cincin-exit-duration');

    for (const [key, card] of mounted) {
      dropCard(key, card);
    }

    layout.destroy();
    presenter.unmount();
  };
}

export { mountToastRegion };
