import { Toaster, toast } from 'cincin-react';

let counter = 0;

const scenarios: Array<[label: string, run: () => void]> = [
  [
    'Message',
    () => {
      counter += 1;
      toast.message({ title: `Plain toast #${counter}` });
    },
  ],
  ['Success', () => toast.success({ title: 'Saved' })],
  [
    'Error',
    () =>
      toast.error({
        title: 'Something broke',
        description: 'The request did not survive the round trip.',
      }),
  ],
  [
    'Sticky',
    () =>
      toast.info(
        { title: 'Sticky: swipe right or hit the cross' },
        { duration: Infinity }
      ),
  ],
  [
    'Action',
    () =>
      toast.warning({
        title: 'File deleted',
        description: 'You have a few seconds to change your mind.',
        action: { label: 'Undo', onClick: () => console.log('undo!') },
      }),
  ],
  [
    'Promise',
    () =>
      void toast
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
    'Burst ×8',
    () => {
      for (let i = 1; i <= 8; i += 1) {
        counter += 1;
        toast.message({ title: `Burst ${i}/8 (#${counter})` });
      }
    },
  ],
  ['Dismiss all', () => toast.remove()],
];

function App() {
  return (
    <main>
      <h1>🥂 cincin · react skin</h1>
      <p>
        The ready-to-use <code>&lt;Toaster /&gt;</code> over the package
        singleton. Swipe a toast to the right, hover or tap the stack to expand
        it.
      </p>
      <section>
        {scenarios.map(([label, run]) => (
          <button key={label} type="button" onClick={run}>
            {label}
          </button>
        ))}
      </section>

      <Toaster />
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
