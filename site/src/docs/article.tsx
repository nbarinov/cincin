import { useTranslations } from 'use-intl';
import { docs } from '@/content/docs';
import { components } from '@/mdx/components';
import styles from './article.module.css';

type ArticleProps = {
  path: string;
  title: string;
  description?: string | undefined;
  translated: boolean;
};

function Article({ path, title, description, translated }: ArticleProps) {
  const t = useTranslations('docs.article');
  const page = docs.getPage(path);

  if (page === undefined) {
    throw new Error(`Unknown page: ${path}`);
  }

  const MDX = page.body;

  return (
    <article className={styles.article} lang={translated ? undefined : 'en'}>
      {!translated && <p className={styles.note}>{t('untranslated')}</p>}

      <h1 className={styles.title}>{title}</h1>

      {description !== undefined && (
        <p className={styles.lede}>{description}</p>
      )}

      <MDX components={components} />
    </article>
  );
}

export { Article };
