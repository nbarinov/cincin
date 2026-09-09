import { createToaster } from 'cincin';
import type { ToastEntry } from 'cincin';
import * as React from 'react';
import * as Toast from '@radix-ui/react-toast';

/**
 * A toaster drawn by Radix's Toast primitives, over the bare entry store.
 *
 * Radix's Toast is already a presenter: it runs the expiry clock and
 * pauses it while the stack is being read (a pointer over it, focus
 * inside it, a blurred window), it plays a card's exit before unmounting
 * it, and it owns the accessibility — the live region and its announcer,
 * the F8 hotkey, the focus rotation, the swipe, Escape. So this example
 * subscribes to the records and stops there: no `cincin/presenter`, no
 * second clock, no second set of listeners.
 *
 * Two things go with the presenter, and they are worth knowing before
 * copying this:
 *
 * - A record removed from app code (`toaster.remove(id)`, the page's
 *   "Dismiss all") takes its card with it. Radix plays an exit per card,
 *   and a card React has already unmounted plays nothing. Keeping the
 *   showing alive as a ghost until its exit is over is precisely what
 *   the presenter is for.
 * - Radix restarts its clock only when the `duration` prop changes
 *   value, so a toast morphed in place inherits what is left of the
 *   original span instead of the fresh one the presenter would hand it.
 *
 * The Motion example next door drops the presenter too and has neither
 * problem: `AnimatePresence` owns the exit for the whole list, so the
 * ghost comes for free there. Radix owns it per card, which is where
 * the difference comes from.
 */

interface ToastAction {
  label: string;
  /** Radix asks for the spoken equivalent of the button. */
  altText: string;
  onClick: (event: React.MouseEvent) => void;
}

/** What a toast carries here. The core is content-agnostic. */
interface ToastContent {
  title: string;
  description?: string;
  action?: ToastAction;
}

/** The exit animation's length: the stylesheet reads it off the viewport,
 * and a closing card holds its record back for exactly that long. */
const EXIT_DURATION = 200;

/** Cards on screen at once. The rest wait in the store. */
const MAX = 3;

/** The example-wide store: call it from anywhere on the page. */
const toaster = createToaster<ToastContent>();

function RadixToaster() {
  // The entry store is already an external store in React's sense:
  // a stable snapshot swapped on every commit.
  const entries = React.useSyncExternalStore(
    toaster.subscribe,
    toaster.getSnapshot,
    toaster.getSnapshot
  );

  return (
    <Toast.Provider label="Notification" swipeDirection="right">
      {/* The queue, for free: an entry with no card has no Radix clock
          either, so its span starts when a slot frees. */}
      {entries.slice(0, MAX).map((entry) => (
        <ToastCard key={entry.id} entry={entry} />
      ))}

      {/* Radix portals every card in here, so the region keeps its
          reading order no matter where the cards are rendered. */}
      <Toast.Viewport
        className="toasts"
        style={
          {
            '--toast-exit-duration': `${EXIT_DURATION}ms`,
          } as React.CSSProperties
        }
      />
    </Toast.Provider>
  );
}

function ToastCard({ entry }: { entry: ToastEntry<ToastContent> }) {
  const { title, description, action } = entry.content;

  // Open is controlled so that a create over this id can reopen a card
  // already on its way out: cincin reads a create as "show it", and an
  // uncontrolled Radix toast would stay closed until it is remounted.
  const [open, setOpen] = React.useState(true);
  React.useEffect(() => {
    setOpen(true);
  }, [entry.updatedAt]);

  // Radix has no notion of a locked toast (a pending promise), so the
  // ways out are stopped at the source for one: no swipe, no Escape.
  // The cross is not rendered either, so nothing is left to ask.
  const lockIfNeeded = (event: { preventDefault: () => void }) => {
    if (!entry.dismissible) {
      event.preventDefault();
    }
  };

  return (
    <Toast.Root
      className="toast"
      data-type={entry.type}
      // An error interrupts; everything else is announced politely.
      type={entry.type === 'error' ? 'foreground' : 'background'}
      // The only clock here. `Infinity` — a sticky toast, or the pending
      // phase of a promise — reads as "no timer" to Radix.
      duration={entry.duration}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          return;
        }

        // The card is playing its exit; the record leaves when that is
        // over, unless a create reopened the card in the meantime.
        const closedAt = entry.updatedAt;
        window.setTimeout(() => {
          const live = toaster
            .getSnapshot()
            .find((candidate) => candidate.id === entry.id);
          if (live?.updatedAt === closedAt) {
            toaster.remove(entry.id);
          }
        }, EXIT_DURATION);
      }}
      onEscapeKeyDown={lockIfNeeded}
      onSwipeStart={lockIfNeeded}
      onSwipeMove={lockIfNeeded}
      onSwipeEnd={lockIfNeeded}
    >
      <span className="toast-dot" aria-hidden="true" />
      <div className="toast-body">
        <Toast.Title className="toast-title">{title}</Toast.Title>
        {description !== undefined && (
          <Toast.Description className="toast-description">
            {description}
          </Toast.Description>
        )}
      </div>
      {action !== undefined && (
        // A click on an action closes the card, unless the handler
        // prevents the event: the Undo scenario does exactly that to
        // morph the same card into its confirmation.
        <Toast.Action
          className="toast-action"
          altText={action.altText}
          onClick={action.onClick}
        >
          {action.label}
        </Toast.Action>
      )}
      {entry.dismissible && (
        <Toast.Close className="toast-close" aria-label="Dismiss">
          ×
        </Toast.Close>
      )}
    </Toast.Root>
  );
}

export { toaster, RadixToaster, EXIT_DURATION };
export type { ToastContent, ToastAction };
