import { Link } from '@tanstack/react-router';
import { useLocale, useTranslations } from 'use-intl';
import { Pill } from './pill';

const NAMES = { en: 'English', ru: 'Русский' };

function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations('ui.localeSwitcher');
  const other = locale === 'en' ? 'ru' : 'en';

  return (
    <Pill
      render={
        <Link
          to="."
          params={(prev) => ({
            ...prev,
            locale: other === 'en' ? undefined : other,
          })}
          aria-label={t('label')}
        >
          {NAMES[other]}
        </Link>
      }
    />
  );
}

export { LocaleSwitcher };
