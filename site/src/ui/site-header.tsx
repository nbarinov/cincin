import { Link } from '@tanstack/react-router';
import { useTranslations } from 'use-intl';
import { REPO_URL } from '@/shared/site';
import { Pill } from './pill';
import { Brand } from './brand';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';
import styles from './site-header.module.css';

function SiteHeader() {
  const t = useTranslations('ui.siteHeader');

  return (
    <header className={styles.header}>
      <Brand />
      <nav className={styles.actions} aria-label={t('label')}>
        <Link
          to="/{-$locale}/docs"
          params={(prev) => ({ locale: prev.locale })}
          className={styles.link}
        >
          {t('docs')}
        </Link>
        <Pill
          render={
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
          }
        />
        <ThemeToggle />
        <LocaleSwitcher />
      </nav>
    </header>
  );
}

export { SiteHeader };
