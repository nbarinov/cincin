import { Link } from '@tanstack/react-router';
import { useLocale, useTranslations } from 'use-intl';
import { Pill } from './pill';
import { VisuallyHidden } from './visually-hidden';

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
        >
          <VisuallyHidden>
            {t('label', { language: NAMES[other] })}
          </VisuallyHidden>
          <span lang={other} aria-hidden>
            {NAMES[other]}
          </span>
        </Link>
      }
    />
  );
}

export { LocaleSwitcher };
