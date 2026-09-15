import * as React from 'react';
import {
  applyOverride,
  readOverride,
  readServerOverride,
  readServerSystemDark,
  readSystemDark,
  subscribeOverride,
  subscribeSystem,
} from '@/shared/theme';
import { Pill } from './pill';
import styles from './theme-toggle.module.css';

function ThemeToggle() {
  const override = React.useSyncExternalStore(
    subscribeOverride,
    readOverride,
    readServerOverride
  );
  const systemDark = React.useSyncExternalStore(
    subscribeSystem,
    readSystemDark,
    readServerSystemDark
  );

  const dark = (override ?? (systemDark ? 'dark' : 'light')) === 'dark';

  return (
    <Pill
      type="button"
      className={styles.toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => {
        const next = dark ? 'light' : 'dark';

        const nextOverride =
          next === (systemDark ? 'dark' : 'light') ? null : next;

        applyOverride(nextOverride);
      }}
    >
      <span data-label="dark">Dark</span>
      <span data-label="light">Light</span>
    </Pill>
  );
}

export { ThemeToggle };
