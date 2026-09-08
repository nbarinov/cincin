import { createToaster } from 'cincin';
import { usePresenter, useToasts } from 'cincin-react/core';
import type { Presenter, Toast as Showing } from 'cincin-react/core';
import * as React from 'react';
import * as Toast from '@radix-ui/react-toast';

/**
 * A toaster drawn by Radix's Toast primitives.
 *
 * The split is the whole example: Radix owns the interaction and the
 * accessibility — the live region and its announcer, the F8 hotkey, the
 * focus rotation, the swipe, Escape — and cincin owns the records and
 * the showing: the store, the queue, the expiry clocks, and the leaving
 * phase an exit animation needs. Nothing is built twice. Radix's own
 * `duration` timer stays off, and the pause it already detects (a
 * pointer over the stack, focus inside it, a blurred window) drives
 * cincin's clocks instead of a second set of listeners.
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

/** Declared once: the presenter finishes a leaving toast on this clock
 * (no animationend listener), and the stylesheet reads the same value
 * off the viewport to animate the exit. */
const EXIT_DURATION = 200;

/** The example-wide store: call it from anywhere on the page. */
const toaster = createToaster<ToastContent>();

function RadixToaster() {
  const presenter = usePresenter(toaster, {
    max: 3,
    exitDuration: EXIT_DURATION,
  });
  const toasts = useToasts(presenter);
  const [paused, setPaused] = React.useState(false);

  // Radix decides when the stack is being read and says so per toast;
  // cincin's clocks obey. `toasts` sits in the deps on purpose: a toast
  // promoted out of the queue while the pointer rests on the stack has
  // to start frozen too, and Radix will not announce a pause it already
  // announced. Both calls are idempotent.
  React.useEffect(() => {
    if (paused) {
      presenter.pause();
    } else {
      presenter.resume();
    }
  }, [presenter, paused, toasts]);

  return (
    <Toast.Provider label="Notification" swipeDirection="right">
      {toasts
        // A queued toast has no element: it is waiting for a slot.
        .filter((toast) => toast.phase !== 'queued')
        .map((toast) => (
          <ToastCard
            key={toast.key}
            toast={toast}
            presenter={presenter}
            onPausedChange={setPaused}
          />
        ))}

      {/* Radix portals every toast in here, so the region keeps its
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

function ToastCard({
  toast,
  presenter,
  onPausedChange,
}: {
  toast: Showing<ToastContent>;
  presenter: Presenter<ToastContent>;
  onPausedChange: (paused: boolean) => void;
}) {
  const { entry } = toast;
  const { title, description, action } = entry.content;

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
      // One clock, and it is cincin's: it rewinds when a toast morphs in
      // place, banks its remainder while paused, and does not start at
      // all until the queue lets the toast on screen. Radix restarts its
      // own timer only when the `duration` prop changes value, so with
      // both running the staler one would win — the Undo confirmation,
      // morphed into a card that has already spent three of its four
      // seconds, would be cut to one. Hence Infinity: Radix reads that
      // as "no timer" and leaves the expiry to the presenter.
      duration={Infinity}
      // The entry is gone the moment it is removed; the presenter keeps
      // the showing alive as a ghost so the exit can play, and that is
      // exactly what `open` animates.
      open={toast.phase !== 'leaving'}
      onOpenChange={(open) => {
        // Radix asks to close (the cross, a swipe, Escape); cincin
        // decides what it means: the toast starts leaving, and the
        // entry goes once the exit is finished.
        if (!open) {
          presenter.dismiss(toast.key);
        }
      }}
      onPause={() => onPausedChange(true)}
      onResume={() => onPausedChange(false)}
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
        // A click on an action closes the toast, unless the handler
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
