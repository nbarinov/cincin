import { useState } from 'react';
import { Toaster } from 'cincin-react';
import { SCENARIOS } from './scenarios';
import { ThemeToggle } from './theme-toggle';

const REPO_URL = 'https://github.com/nbarinov/cincin';

function App() {
  // The panel shows the call behind the last button pressed: the demo
  // and its documentation are the same click.
  const [snippet, setSnippet] = useState(
    `// from the quick start
toast.success({ title: 'Saved' })`
  );

  return (
    <>
      <header className="top">
        <div className="brand">
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            🥂 cincin
          </a>
          <span className="tag">beta</span>
        </div>
        <nav className="top-actions">
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <ThemeToggle />
        </nav>
      </header>

      <main>
        <p className="glyph" aria-hidden>
          🥂
        </p>
        <h1>cincin</h1>
        <p className="lede">
          Framework-agnostic toast library: an entry store, a presenter that
          shows it, thin adapters, polished UX.
        </p>

        <h2>Try it</h2>
        <section className="controls" aria-label="Toast scenarios">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.label}
              type="button"
              className={scenario.label === 'Dismiss all' ? 'quiet' : undefined}
              onClick={() => {
                setSnippet(scenario.code);
                scenario.run();
              }}
            >
              {scenario.dot !== undefined && (
                <span className="dot" data-type={scenario.dot} aria-hidden />
              )}
              {scenario.label}
            </button>
          ))}
        </section>

        <pre className="snippet" aria-live="polite">
          <code>{snippet}</code>
        </pre>

        <p className="footnote">
          Swipe a toast to the right to dismiss it. Hover the stack to expand it
          — the timers pause while it is open, and while the tab is hidden.
        </p>
      </main>

      <footer className="credits">
        UX inspired by Emil Kowalski&apos;s{' '}
        <a href="https://sonner.emilkowal.ski" target="_blank" rel="noreferrer">
          sonner
        </a>
        .
      </footer>

      <Toaster />
    </>
  );
}

export { App };
