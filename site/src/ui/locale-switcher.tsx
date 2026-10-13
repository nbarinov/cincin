import { Link } from '@tanstack/react-router';
import { useTranslations } from 'use-intl';
import { type Locale, LOCALES, DEFAULT_LOCALE } from '@/shared/i18n/config';
import { VisuallyHidden } from './visually-hidden';
import styles from './locale-switcher.module.css';

const NAMES = { en: 'English', ru: 'Русский' } satisfies Record<Locale, string>;

function LocaleSwitcher() {
  const t = useTranslations('ui.localeSwitcher');

  return (
    <ul className={styles.group} aria-label={t('label')}>
      {LOCALES.map((locale) => (
        <li key={locale} className={styles.item}>
          <Link
            to="."
            params={(prev) => ({
              ...prev,
              locale: locale === DEFAULT_LOCALE ? undefined : locale,
            })}
            activeOptions={{ exact: true }}
            activeProps={{ tabIndex: -1 }}
            hrefLang={locale}
            lang={locale}
            className={styles.link}
          >
            {locale}
            <VisuallyHidden> {NAMES[locale]}</VisuallyHidden>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export { LocaleSwitcher };
