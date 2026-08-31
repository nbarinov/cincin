import { Toaster, toast } from 'cincin-react';
import { initFixture } from '../../shared/params';
import { createScenarios } from '../../shared/scenarios';

const { position, duration } = initFixture();
const scenarios = createScenarios(toast, { duration });

function App() {
  return (
    <main>
      <h1>cincin e2e · react</h1>

      {scenarios.map((scenario) => (
        <button
          key={scenario.id}
          type="button"
          data-testid={scenario.id}
          onClick={scenario.run}
        >
          {scenario.label}
        </button>
      ))}

      <Toaster position={position} />
    </main>
  );
}

export { App };
