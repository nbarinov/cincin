import { useTranslations } from 'use-intl';
import { Brand } from './brand';
import { LocaleSwitcher } from './locale-switcher';
import { ProjectLinks } from './project-links';
import { ThemeToggle } from './theme-toggle';
import styles from './site-header.module.css';

function SiteHeader() {
  const t = useTranslations('ui.siteHeader');

  return (
    <header className={styles.header}>
      <Brand />
      <nav className={styles.actions} aria-label={t('label')}>
        <ProjectLinks />
        <ThemeToggle />
        <LocaleSwitcher />
      </nav>
    </header>
  );
}

export { SiteHeader };
