import { REPO_URL } from '@/shared/site';
import { Pill } from './pill';
import { Brand } from './brand';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';
import styles from './docs-header.module.css';

function DocsHeader() {
  return (
    <header className={styles.header}>
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
    </header>
  );
}

export { DocsHeader };
