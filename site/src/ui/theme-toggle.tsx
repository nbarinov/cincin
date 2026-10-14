import * as React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'use-intl';
import { theme, type Theme } from '@/shared/theme';
import { IconButton, type IconButtonProps } from './icon-button';
import { VisuallyHidden } from './visually-hidden';

type Mode = Theme | 'auto';

const NEXT: Record<Mode, Mode> = { auto: 'light', light: 'dark', dark: 'auto' };
const ICON: Record<Mode, LucideIcon> = {
  auto: Monitor,
  light: Sun,
  dark: Moon,
};

function ThemeToggle({ variant }: Pick<IconButtonProps, 'variant'>) {
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
    <IconButton
      type="button"
      variant={variant}
      onClick={() => theme.apply(next === 'auto' ? null : next)}
    >
      <Icon />
      <VisuallyHidden>{t('label', { next })}</VisuallyHidden>
    </IconButton>
  );
}

export { ThemeToggle };
