import * as React from 'react';
import { useTranslations } from 'use-intl';
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
  const t = useTranslations('ui.themeToggle');

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
      aria-label={t(dark ? 'toLight' : 'toDark')}
      onClick={() => {
        const next = dark ? 'light' : 'dark';

        const nextOverride =
          next === (systemDark ? 'dark' : 'light') ? null : next;

        applyOverride(nextOverride);
      }}
    >
      <span data-label="dark">{t('dark')}</span>
      <span data-label="light">{t('light')}</span>
    </Pill>
  );
}

export { ThemeToggle };
