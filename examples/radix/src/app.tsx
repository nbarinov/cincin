import { RadixToaster, toaster } from './toaster';

let counter = 0;

const scenarios: Array<[label: string, run: () => void]> = [
  [
    'Message',
    () => {
      counter += 1;
      toaster.message({ title: `Plain toast #${counter}` });
    },
  ],
  ['Success', () => toaster.success({ title: 'Saved' })],
  [
    'Error',
    () =>
      toaster.error({
        title: 'Something broke',
        description: 'The request did not survive the round trip.',
      }),
  ],
  [
    'Sticky',
    () =>
      toaster.info(
        { title: 'Sticky: swipe right, hit the cross or press Escape' },
        { duration: Infinity }
      ),
  ],
  [
    // The click would close the card, exactly like the cross does;
    // preventing it lets the confirmation morph the same card in place
    // instead. The clock is Radix's here, and it restarts only when the
    // `duration` prop changes value: both types run on the same four
    // seconds, so the confirmation inherits what is left of them rather
    // than starting a fresh span the way `cincin/presenter` would.
    'Undo',
    () => {
      const toastId = toaster.message({
        title: 'Message archived',
        action: {
          label: 'Undo',
          altText: 'Undo archiving the message',
          onClick: (event) => {
            event.preventDefault();
            toaster.success({ title: 'Archive restored' }, { id: toastId });
          },
        },
      });
    },
  ],
  [
    // The pending phase is locked: no cross, no swipe, no Escape, and
    // no expiry either. It leaves when the promise settles, and the
    // settled card does get a full four seconds: the duration went from
    // Infinity to a number, which is Radix's cue to start a clock.
    'Promise',
    () =>
      void toaster
        .promise(fakeRequest(), {
          loading: { title: 'Uploading…' },
          success: (ms: number) => ({
            title: `Uploaded in ${Math.round(ms)}ms`,
          }),
          error: () => ({ title: 'Upload failed' }),
        })
        .catch(() => {
          // The rejection is already reported as an error toast.
        }),
  ],
  [
    // Three slots, five toasts: the last two wait their turn, and their
    // clocks only start once they are on screen.
    'Burst ×5',
    () => {
      for (let i = 1; i <= 5; i += 1) {
        counter += 1;
        toaster.message({ title: `Burst ${i}/5 (#${counter})` });
      }
    },
  ],
  [
    // The one place the missing presenter shows: removing the records
    // takes their cards with them, with no exit to play. Radix animates
    // a card out on its way to closing, and these are gone from the
    // tree before that starts.
    'Dismiss all',
    () => toaster.remove(),
  ],
];

function App() {
  return (
    <main>
      <h1>🥂 cincin · radix ui</h1>
      <p>
        cincin's bare entry store behind{' '}
        <a
          href="https://www.radix-ui.com/primitives/docs/components/toast"
          target="_blank"
          rel="noreferrer"
        >
          Radix Toast
        </a>
        , no <code>cincin/presenter</code>: Radix already runs the clocks and
        the pauses, plays each card's exit, and owns the live region, the swipe,
        Escape and the <kbd>F8</kbd> hotkey that focuses the stack. cincin keeps
        the records and their vocabulary — types, promises, morphing a live
        toast in place — and the queue is a <code>slice</code> away, three at a
        time here. Hover the stack, or leave the tab, to pause it.
      </p>
      <section>
        {scenarios.map(([label, run]) => (
          <button key={label} type="button" onClick={run}>
            {label}
          </button>
        ))}
      </section>

      <RadixToaster />
    </main>
  );
}

export { App };

// utils

function fakeRequest(): Promise<number> {
  const duration = 800 + Math.random() * 1200;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.3) {
        reject(new Error('flaky network'));
      } else {
        resolve(duration);
      }
    }, duration);
  });
}
