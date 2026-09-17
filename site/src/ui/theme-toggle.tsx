import * as React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'use-intl';
import { theme, type Theme } from '@/shared/theme';
import { Pill } from './pill';
import { VisuallyHidden } from './visually-hidden';
import styles from './theme-toggle.module.css';

type Mode = Theme | 'auto';

const NEXT: Record<Mode, Mode> = { auto: 'light', light: 'dark', dark: 'auto' };
const ICON: Record<Mode, LucideIcon> = {
  auto: Monitor,
  light: Sun,
  dark: Moon,
};

function ThemeToggle() {
  const t = useTranslations('ui.themeToggle');
  const stored = React.useSyncExternalStore(
    theme.subscribe,
    theme.getSnapshot,
    theme.getServerSnapshot
  );
  const mode: Mode = stored ?? 'auto';
  const next = NEXT[mode];
  const Icon = ICON[mode];

  return (
    <Pill
      type="button"
      className={styles.toggle}
      onClick={() => theme.apply(next === 'auto' ? null : next)}
    >
      <Icon className={styles.icon} aria-hidden />
      <VisuallyHidden>{t('label', { next })}</VisuallyHidden>
    </Pill>
  );
}

export { ThemeToggle };
