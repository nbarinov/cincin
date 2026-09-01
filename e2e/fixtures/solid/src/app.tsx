import { Toaster, toast } from 'cincin-solid';
import { initFixture } from '../../shared/params';
import { createScenarios } from '../../shared/scenarios';

const { position, duration } = initFixture();
const scenarios = createScenarios(toast, { duration });

function App() {
  return (
    <main>
      <h1>cincin e2e · solid</h1>

      {scenarios.map((scenario) => (
        <button type="button" data-testid={scenario.id} onClick={scenario.run}>
          {scenario.label}
        </button>
      ))}

      <Toaster position={position} />
    </main>
  );
}

export { App };
