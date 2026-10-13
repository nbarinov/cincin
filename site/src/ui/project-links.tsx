import { cva, type VariantProps } from 'class-variance-authority';
import { useTranslations } from 'use-intl';
import { REPO_URL, EXAMPLES_URL } from '@/shared/site';
import styles from './project-links.module.css';

const list = cva(null, {
  variants: {
    variant: {
      items: styles.items,
      tiles: styles.tiles,
    },
  },
  defaultVariants: {
    variant: 'items',
  },
});

function ProjectLinks({ variant }: VariantProps<typeof list>) {
  const t = useTranslations('ui.projectLinks');

  return (
    <ul className={list({ variant })}>
      <li>
        <a
          href={EXAMPLES_URL}
          target="_blank"
          rel="noreferrer"
          className={styles.link}
        >
          {t('examples')}
        </a>
      </li>
      <li>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className={styles.link}
        >
          GitHub
        </a>
      </li>
    </ul>
  );
}

export { ProjectLinks };
