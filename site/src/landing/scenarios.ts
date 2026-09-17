import { toast } from 'cincin-react';
import type { useTranslations } from 'use-intl';

type Scenario = {
  id: string;
  label: string;
  dot?: 'message' | 'info' | 'success' | 'warning' | 'error' | 'loading';
  code: string;
  run: () => void;
};

type Translate = ReturnType<typeof useTranslations<'landing.scenarios'>>;

function createScenarios(t: Translate): Scenario[] {
  const retry = (): void => {
    void toast.success({
      title: t('error.recoveredTitle'),
      description: t('error.recoveredDescription'),
    });
  };

  return [
    {
      id: 'message',
      label: t('message.label'),
      dot: 'message',
      code: `toast.message({ title: ${str(t('message.title'))} })`,
      run: () => void toast.message({ title: t('message.title') }),
    },
    {
      id: 'success',
      label: t('success.label'),
      dot: 'success',
      code: `toast.success({
  title: ${str(t('success.title'))},
  description: ${str(t('success.description'))},
})`,
      run: () =>
        void toast.success({
          title: t('success.title'),
          description: t('success.description'),
        }),
    },
    {
      id: 'info',
      label: t('info.label'),
      dot: 'info',
      code: `toast.info({
  title: ${str(t('info.title'))},
  description: ${str(t('info.description'))},
})`,
      run: () =>
        void toast.info({
          title: t('info.title'),
          description: t('info.description'),
        }),
    },
    {
      id: 'warning',
      label: t('warning.label'),
      dot: 'warning',
      code: `toast.warning({
  title: ${str(t('warning.title'))},
  description: ${str(t('warning.description'))},
})`,
      run: () =>
        void toast.warning({
          title: t('warning.title'),
          description: t('warning.description'),
        }),
    },
    {
      id: 'error',
      label: t('error.label'),
      dot: 'error',
      code: `toast.error({
  title: ${str(t('error.title'))},
  description: ${str(t('error.description'))},
  actions: [{ label: ${str(t('error.retry'))}, onClick: retry }],
})`,
      run: () =>
        void toast.error({
          title: t('error.title'),
          description: t('error.description'),
          actions: [{ label: t('error.retry'), onClick: retry }],
        }),
    },
    {
      id: 'promise',
      label: t('promise.label'),
      dot: 'loading',
      code: `toast.promise(upload(), {
  loading: { title: ${str(t('promise.loading'))} },
  success: (ms) => ({ title: \`${t('promise.success', { ms: '${ms}' })}\` }),
  error: () => ({ title: ${str(t('promise.error'))} }),
})`,
      run: () =>
        void toast
          .promise(upload(), {
            loading: { title: t('promise.loading') },
            success: (ms: number) => ({
              title: t('promise.success', { ms: Math.round(ms) }),
            }),
            error: () => ({ title: t('promise.error') }),
          })
          .catch(() => {
            // ignore
          }),
    },
    {
      id: 'undo',
      label: t('undo.label'),
      code: `const toastId = toast.message({
  title: ${str(t('undo.title'))},
  closeButton: false,
  actions: [
    {
      label: ${str(t('undo.action'))},
      onClick: (e) => {
        e.preventDefault();
        toast.success(
          { title: ${str(t('undo.restored'))} },
          { id: toastId }
        );
      },
    },
  ],
})`,
      run: () => {
        const toastId = toast.message({
          title: t('undo.title'),
          closeButton: false,
          actions: [
            {
              label: t('undo.action'),
              onClick: (e) => {
                e.preventDefault();
                toast.success({ title: t('undo.restored') }, { id: toastId });
              },
            },
          ],
        });
      },
    },
    {
      id: 'decide',
      label: t('decide.label'),
      code: `const toastId = toast.info(
  {
    title: ${str(t('decide.title'))},
    description: ${str(t('decide.description'))},
    actions: [
      {
        label: ${str(t('decide.decline'))},
        variant: 'secondary',
        onClick: (e) => {
          e.preventDefault();
          toast.message(
            { title: ${str(t('decide.declined'))} },
            { id: toastId }
          );
        },
      },
      {
        label: ${str(t('decide.accept'))},
        onClick: (e) => {
          e.preventDefault();
          toast.success(
            { title: ${str(t('decide.joined'))} },
            { id: toastId }
          );
        },
      },
    ],
  },
  { duration: Infinity, dismissible: false }
)`,
      run: () => {
        const toastId = toast.info(
          {
            title: t('decide.title'),
            description: t('decide.description'),
            actions: [
              {
                label: t('decide.decline'),
                variant: 'secondary',
                onClick: (e) => {
                  e.preventDefault();
                  toast.message(
                    { title: t('decide.declined') },
                    { id: toastId }
                  );
                },
              },
              {
                label: t('decide.accept'),
                onClick: (e) => {
                  e.preventDefault();
                  toast.success({ title: t('decide.joined') }, { id: toastId });
                },
              },
            ],
          },
          { duration: Infinity, dismissible: false }
        );
      },
    },
    {
      id: 'update',
      label: t('update.label'),
      code: `const id = toast.loading({ title: ${str(t('update.preparing'))} });

// later, same toast, no exit in between:
toast.update(id, {
  type: 'success',
  content: { title: ${str(t('update.ready'))} },
})`,
      run: () => {
        const id = toast.loading({ title: t('update.preparing') });

        setTimeout(() => {
          toast.update(id, {
            type: 'success',
            content: { title: t('update.ready') },
          });
        }, 1400);
      },
    },
    {
      id: 'dismiss',
      label: t('dismiss.label'),
      code: `toast.remove()`,
      run: () => toast.remove(),
    },
  ];
}

export { createScenarios };
export type { Scenario };

// utils

function str(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
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
