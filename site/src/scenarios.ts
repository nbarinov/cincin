import { toast } from 'cincin-react';

/**
 * One scenario = a button, the call it makes, and the snippet shown in
 * the code panel. The snippet is the source of the call verbatim: a
 * visitor should be able to copy it into their app and get what they
 * just saw.
 */
type Scenario = {
  label: string;
  /** The type whose accent the button dot borrows; omitted = no dot. */
  dot?: 'message' | 'info' | 'success' | 'warning' | 'error' | 'loading';
  code: string;
  run: () => void;
};

const SCENARIOS: Scenario[] = [
  {
    label: 'Message',
    dot: 'message',
    code: `toast.message({ title: 'Copied to clipboard' })`,
    run: () => void toast.message({ title: 'Copied to clipboard' }),
  },
  {
    label: 'Success',
    dot: 'success',
    code: `toast.success({
  title: 'Saved',
  description: 'Changes synced to the server.',
})`,
    run: () =>
      void toast.success({
        title: 'Saved',
        description: 'Changes synced to the server.',
      }),
  },
  {
    label: 'Info',
    dot: 'info',
    code: `toast.info({
  title: 'Connected',
  description: 'Live updates are on.',
})`,
    run: () =>
      void toast.info({
        title: 'Connected',
        description: 'Live updates are on.',
      }),
  },
  {
    label: 'Warning',
    dot: 'warning',
    code: `toast.warning({
  title: 'Storage almost full',
  description: '92% of the quota is used.',
})`,
    run: () =>
      void toast.warning({
        title: 'Storage almost full',
        description: '92% of the quota is used.',
      }),
  },
  {
    label: 'Error',
    dot: 'error',
    code: `toast.error({
  title: 'Something broke',
  description: 'The request did not survive the round trip.',
  action: { label: 'Retry', onClick: retry },
})`,
    run: () =>
      void toast.error({
        title: 'Something broke',
        description: 'The request did not survive the round trip.',
        action: { label: 'Retry', onClick: retry },
      }),
  },
  {
    label: 'Promise',
    dot: 'loading',
    code: `toast.promise(upload(), {
  loading: { title: 'Uploading…' },
  success: (ms) => ({ title: \`Uploaded in \${ms}ms\` }),
  error: () => ({ title: 'Upload failed' }),
})`,
    run: () =>
      void toast
        .promise(upload(), {
          loading: { title: 'Uploading…' },
          success: (ms: number) => ({
            title: `Uploaded in ${Math.round(ms)}ms`,
          }),
          error: () => ({ title: 'Upload failed' }),
        })
        .catch(() => {
          // The rejection is already on screen as the error phase.
        }),
  },
  {
    label: 'Undo',
    // No cross: the button reads as the way out, and without it the
    // skin keeps the whole toast on one line. The toast stays
    // dismissible though, so a flick still closes it. The click would
    // dismiss the toast; preventing it lets the confirmation morph the
    // same card in place instead (the type change to success also
    // rewinds the clock).
    code: `const toastId = toast.message({
  title: 'Message archived',
  closeButton: false,
  action: {
    label: 'Undo',
    onClick: (e) => {
      e.preventDefault();
      toast.success(
        { title: 'Archive restored' },
        { id: toastId }
      );
    },
  },
})`,
    run: () => {
      const toastId = toast.message({
        title: 'Message archived',
        closeButton: false,
        action: {
          label: 'Undo',
          onClick: (e) => {
            e.preventDefault();
            toast.success({ title: 'Archive restored' }, { id: toastId });
          },
        },
      });
    },
  },
  {
    label: 'Update',
    code: `const id = toast.loading({ title: 'Preparing export…' });

// later, same toast, no exit in between:
toast.update(id, {
  type: 'success',
  content: { title: 'Export ready' },
})`,
    run: () => {
      const id = toast.loading({ title: 'Preparing export…' });

      setTimeout(() => {
        toast.update(id, {
          type: 'success',
          content: { title: 'Export ready' },
        });
      }, 1400);
    },
  },
  {
    label: 'Dismiss all',
    code: `toast.remove()`,
    run: () => toast.remove(),
  },
];

export { SCENARIOS };
export type { Scenario };

// utils

function retry(): void {
  void toast.success({
    title: 'Recovered',
    description: 'The second try went through.',
  });
}

function upload(): Promise<number> {
  const duration = 800 + Math.random() * 1200;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.25) {
        reject(new Error('flaky network'));
      } else {
        resolve(duration);
      }
    }, duration);
  });
}
