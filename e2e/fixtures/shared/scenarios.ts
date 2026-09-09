import type { Toaster } from 'cincin';

type ScenarioContent = {
  title: string;
  actions?: Array<{
    label: string;
    onClick: (event: { preventDefault(): void }) => void;
  }>;
};

type ScenarioToaster = Pick<
  Toaster<ScenarioContent>,
  'message' | 'info' | 'error' | 'remove'
>;

type Scenario = {
  id: string;
  label: string;
  run: () => void;
};

function createScenarios(
  toast: ScenarioToaster,
  { duration }: { duration?: number }
): Scenario[] {
  let counter = 0;

  return [
    {
      id: 'message',
      label: 'Message',
      run: () => {
        counter += 1;
        toast.message({ title: `Toast #${counter}` }, { duration });
      },
    },
    {
      id: 'error',
      label: 'Error',
      run: () => toast.error({ title: 'Something broke' }, { duration }),
    },
    {
      id: 'sticky',
      label: 'Sticky',
      run: () => toast.info({ title: 'Sticky toast' }, { duration: Infinity }),
    },
    {
      id: 'burst',
      label: 'Burst ×5',
      run: () => {
        for (let i = 1; i <= 5; i += 1) {
          counter += 1;
          toast.message({ title: `Burst ${i} (#${counter})` }, { duration });
        }
      },
    },
    {
      // An action that keeps its toast and rewrites it in place: the
      // focused button goes away, the card stays.
      id: 'decide',
      label: 'Decide',
      run: () => {
        const id = toast.info(
          {
            title: 'Anna wants to join',
            actions: [
              {
                label: 'Accept',
                onClick: (event) => {
                  event.preventDefault();
                  toast.message({ title: 'Anna joined' }, { id });
                },
              },
            ],
          },
          { duration: Infinity }
        );
      },
    },
    {
      id: 'dismiss-all',
      label: 'Dismiss all',
      run: () => toast.remove(),
    },
  ];
}

export { createScenarios };
export type { Scenario, ScenarioContent, ScenarioToaster };
