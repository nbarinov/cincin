import type { ReactNode } from 'react';
import styles from './page.module.css';

type DocsPageProps = {
  aside: ReactNode;
  children: ReactNode;
};

function DocsPage({ aside, children }: DocsPageProps) {
  return (
    <div className={styles.page}>
      {children}
      <div className={styles.aside}>{aside}</div>
    </div>
  );
}

export { DocsPage };
