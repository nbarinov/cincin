import { Link } from '@tanstack/react-router';
import { isLocale } from '@/shared/i18n/config';
import { REPO_URL } from '@/shared/site';
import { Pill } from './pill';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';
import styles from './site-header.module.css';

function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link
        to="/{-$locale}"
        params={(prev) => ({
          locale:
            prev.locale !== undefined && isLocale(prev.locale)
              ? prev.locale
              : undefined,
        })}
        activeOptions={{ exact: true }}
        className={styles.brand}
        lang="en"
      >
        🥂 cincin
      </Link>
      <nav className={styles.actions}>
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
