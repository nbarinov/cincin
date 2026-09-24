import { REPO_URL } from '@/shared/site';
import { Pill } from '@/ui/pill';
import { Brand } from '@/ui/brand';
import { LocaleSwitcher } from '@/ui/locale-switcher';
import { ThemeToggle } from '@/ui/theme-toggle';
import styles from './header.module.css';

function DocsHeader() {
  return (
    <div className={styles.header}>
      <Brand />
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
    </div>
  );
}

export { DocsHeader };
