import type { ReactNode } from 'react';
import styles from './layout.module.css';

type DocsLayoutProps = {
  header: ReactNode;
  aside: ReactNode;
  children: ReactNode;
};

function DocsLayout({ header, children, aside }: DocsLayoutProps) {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>{header}</header>

      <div className={styles.shell}>
        <div className={styles.aside}>{aside}</div>

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

export { DocsLayout };
