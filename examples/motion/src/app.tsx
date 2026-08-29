import { MotionToaster, toaster } from './toaster';

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
        { title: 'Sticky: swipe right or hit the cross' },
        { duration: Infinity }
      ),
  ],
  [
    // A create over a live id morphs the card in place: the layout
    // animation absorbs the size change, the type change repaints the
    // dot, and the fresh `updatedAt` rewinds the expiry clock.
    'Morph',
    () => {
      const toastId = toaster.warning({
        title: 'Connection lost',
        description: 'Retrying…',
      });
      setTimeout(() => {
        toaster.success({ title: 'Connection restored' }, { id: toastId });
      }, 1600);
    },
  ],
  [
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
    'Burst ×5',
    () => {
      for (let i = 1; i <= 5; i += 1) {
        counter += 1;
        toaster.message({ title: `Burst ${i}/5 (#${counter})` });
      }
    },
  ],
  ['Dismiss all', () => toaster.remove()],
];

function App() {
  return (
    <main>
      <h1>🥂 cincin · motion</h1>
      <p>
        A renderer over the bare entry store, no <code>cincin/presenter</code>:
        exits belong to <code>AnimatePresence</code>, the swipe to{' '}
        <code>drag</code>, and only the expiry clock is hand-rolled. Hover the
        stack to pause it.
      </p>
      <section>
        {scenarios.map(([label, run]) => (
          <button key={label} type="button" onClick={run}>
            {label}
          </button>
        ))}
      </section>

      <MotionToaster />
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
