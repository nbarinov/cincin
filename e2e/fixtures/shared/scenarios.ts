import type { Toaster } from 'cincin';

type ScenarioToaster = Pick<
  Toaster<{ title: string }>,
  'message' | 'info' | 'remove'
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
      id: 'dismiss-all',
      label: 'Dismiss all',
      run: () => toast.remove(),
    },
  ];
}

export { createScenarios };
export type { Scenario, ScenarioToaster };
