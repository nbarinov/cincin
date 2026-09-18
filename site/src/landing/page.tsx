import * as React from 'react';
import { Toaster } from 'cincin-react';
import { useTranslations } from 'use-intl';
import { REPO_URL } from '@/shared/site';
import { Pill } from '@/ui/pill';
import { createScenarios } from './scenarios';
import styles from './page.module.css';

// The `soon` branch stays for the next binding in line.
const TARGETS: Array<{ name: string; href?: string; soon?: boolean }> = [
  { name: 'React', href: `${REPO_URL}/tree/main/packages/cincin-react` },
  { name: 'Vue', href: `${REPO_URL}/tree/main/packages/cincin-vue` },
  { name: 'Solid', href: `${REPO_URL}/tree/main/packages/cincin-solid` },
  { name: 'Preact', href: `${REPO_URL}/tree/main/packages/cincin-preact` },
  { name: 'Angular', href: `${REPO_URL}/tree/main/packages/cincin-angular` },
  { name: 'vanilla', href: `${REPO_URL}/tree/main/examples/vanilla` },
];

function LandingPage() {
  const t = useTranslations('landing');
  const ts = useTranslations('landing.scenarios');
  const scenarios = React.useMemo(() => createScenarios(ts), [ts]);
  const [snippet, setSnippet] = React.useState(scenarios.at(0)?.code);

  return (
    <>
      <main className={styles.main}>
        <p className={styles.glyph} aria-hidden>
          🥂
        </p>
        <h1 className={styles.title} lang="en">
          cincin
        </h1>
        <p className={styles.lede}>{t('hero.lede')}</p>

        <ul className={styles.targets} aria-label={t('targets.label')}>
          {TARGETS.map((target) =>
            target.soon ? (
              <li
                key={target.name}
                className={`${styles.target} ${styles.soon}`}
              >
                {target.name}
                <span className={styles.soonTag}>{t('targets.soon')}</span>
              </li>
            ) : (
              <li key={target.name} className={styles.target}>
                <a href={target.href} target="_blank" rel="noreferrer">
                  {target.name}
                </a>
              </li>
            )
          )}
        </ul>

        <h2 className={styles.heading}>{t('try.title')}</h2>
        <section className={styles.controls} aria-label={t('try.label')}>
          {scenarios.map((scenario) => (
            <Pill
              key={scenario.id}
              type="button"
              variant={scenario.id === 'dismiss' ? 'quiet' : 'card'}
              onClick={() => {
                setSnippet(scenario.code);
                scenario.run();
              }}
            >
              {scenario.dot !== undefined && (
                <span
                  className={styles.dot}
                  data-type={scenario.dot}
                  aria-hidden
                />
              )}
              {scenario.label}
            </Pill>
          ))}
        </section>

        <pre className={styles.snippet} aria-live="polite">
          <code>{snippet}</code>
        </pre>

        <p className={styles.footnote}>{t('try.footnote')}</p>
      </main>

      <footer className={styles.credits}>
        {t.rich('credits', { a: sonnerLink })}
      </footer>

      <Toaster />
    </>
  );
}

export { LandingPage };

// utils

function sonnerLink(chunks: React.ReactNode) {
  return (
    <a href="https://sonner.emilkowal.ski" target="_blank" rel="noreferrer">
      {chunks}
    </a>
  );
}
