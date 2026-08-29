import { createToaster } from 'cincin';
import type { ToastEntry } from 'cincin';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/**
 * A toaster driven by Framer Motion instead of `cincin/presenter`.
 *
 * The presenter exists to solve showing without an animation library:
 * exit phases (the record is gone but the element still needs to play
 * its exit), a queue, expiry clocks. `AnimatePresence` already owns the
 * first problem — a removed entry keeps its element mounted until the
 * exit animation settles — so this example subscribes to the bare entry
 * store and keeps only what Motion does not cover: the expiry clock,
 * paused while the pointer is over the stack.
 */

/** What a toast carries here. The core is content-agnostic. */
interface ToastContent {
  title: string;
  description?: string;
}

type Entry = ToastEntry<ToastContent>;

/** The example-wide store: call it from anywhere on the page. */
const toaster = createToaster<ToastContent>();

/** The entry store is already an external store in React's sense:
 * a stable snapshot swapped on every commit. */
function useEntries(): ReadonlyArray<Entry> {
  return useSyncExternalStore(
    toaster.subscribe,
    toaster.getSnapshot,
    toaster.getSnapshot
  );
}

/**
 * The expiry clock the presenter would otherwise run. Any update
 * rewinds it (`updatedAt` moves), matching the presenter's rule for a
 * morphing toast; while paused the remaining time is banked, not spent.
 */
function useExpiry(entry: Entry, paused: boolean): void {
  const remaining = useRef(entry.duration);

  useEffect(() => {
    remaining.current = entry.duration;
  }, [entry.updatedAt, entry.duration]);

  useEffect(() => {
    if (paused || !Number.isFinite(remaining.current)) {
      return;
    }

    const startedAt = Date.now();
    const timer = setTimeout(() => toaster.remove(entry.id), remaining.current);

    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt;
    };
  }, [entry.id, entry.updatedAt, entry.duration, paused]);
}

function ToastCard({ entry, paused }: { entry: Entry; paused: boolean }) {
  useExpiry(entry, paused);

  return (
    <motion.li
      className="toast"
      data-type={entry.type}
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 72, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      // The swipe gesture, for free: a locked toast does not drag, a
      // short pull snaps back, a far or fast one lets go of the record
      // and the exit above carries the element the rest of the way.
      drag={entry.dismissible ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.04, right: 0.7 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 96 || info.velocity.x > 640) {
          toaster.remove(entry.id);
        }
      }}
    >
      <span className="toast-dot" aria-hidden="true" />
      <div className="toast-body">
        <strong>{entry.content.title}</strong>
        {entry.content.description !== undefined && (
          <p>{entry.content.description}</p>
        )}
      </div>
      {entry.dismissible && (
        <button
          type="button"
          className="toast-close"
          aria-label="Close"
          onClick={() => toaster.remove(entry.id)}
        >
          ×
        </button>
      )}
    </motion.li>
  );
}

function MotionToaster() {
  const entries = useEntries();
  const [paused, setPaused] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      <ol
        className="toasts"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
      >
        {/* popLayout pops a leaving toast out of the flow, so the
            neighbours reflow (via `layout`) while its exit plays. */}
        <AnimatePresence mode="popLayout" initial={false}>
          {entries.map((entry) => (
            <ToastCard key={entry.id} entry={entry} paused={paused} />
          ))}
        </AnimatePresence>
      </ol>
    </MotionConfig>
  );
}

export { toaster, MotionToaster };
export type { ToastContent };
