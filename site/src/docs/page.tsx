import type { ComponentProps } from 'react';
import { Article } from './article';
import type { Anchor } from './load-article';
import { Toc } from './toc';
import styles from './page.module.css';

type DocsPageProps = ComponentProps<typeof Article> & { anchors: Anchor[] };

function DocsPage({ anchors, ...article }: DocsPageProps) {
  return (
    <div className={styles.page}>
      <Article {...article} />
      <div className={styles.toc}>
        <Toc anchors={anchors} />
      </div>
    </div>
  );
}

export { DocsPage };
