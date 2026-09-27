import * as React from 'react';
import { AnchorProvider, TOCItem, useActiveAnchor } from 'fumadocs-core/toc';
import { useTranslations } from 'use-intl';
import type { Anchor } from './load-article';
import styles from './toc.module.css';

function Toc({ anchors }: { anchors: Anchor[] }) {
  const t = useTranslations('docs.toc');
  const id = React.useId();

  return (
    <nav className={styles.toc} aria-labelledby={id}>
      <p id={id} className={styles.heading}>
        {t('label')}
      </p>
      <AnchorProvider toc={anchors} single>
        <AnchorList anchors={anchors} />
      </AnchorProvider>
    </nav>
  );
}

export { Toc };

// components

function AnchorList({ anchors }: { anchors: Anchor[] }) {
  const active = useActiveAnchor();

  return (
    <ul className={styles.list}>
      {anchors.map((item) => (
        <li key={item.url}>
          <TOCItem
            href={item.url}
            className={styles.anchor}
            aria-current={item.url === `#${active}` ? 'location' : undefined}
          >
            {item.title}
          </TOCItem>
        </li>
      ))}
    </ul>
  );
}
