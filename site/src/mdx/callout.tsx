import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import styles from './callout.module.css';

type CalloutProps = {
  type?: 'note' | 'warning';
  children: ReactNode;
};

function Callout({ type = 'note', children }: CalloutProps) {
  const t = useTranslations('docs.callout');
  const locale = useLocale();

  return (
    <div role="note" className={styles.callout} data-type={type}>
      <p lang={locale} className={styles.label}>
        {t(type)}
      </p>
      {children}
    </div>
  );
}

export { Callout };
