import { useLocale, useTranslations } from 'use-intl';
import { getEntry } from '@/content/docs';
import { components } from '@/mdx/components';
import styles from './article.module.css';

type ArticleProps = {
  path: string;
  title: string;
  description?: string;
  translated: boolean;
};

function Article({ path, title, description, translated }: ArticleProps) {
  const t = useTranslations('docs.article');
  const locale = useLocale();
  const MDX = getEntry(path).body;

  return (
    <article className={styles.article} lang={translated ? undefined : 'en'}>
      {!translated && (
        <p lang={locale} className={styles.note}>
          {t('untranslated')}
        </p>
      )}

      <h1 className={styles.title}>{title}</h1>

      {description !== undefined && (
        <p className={styles.lede}>{description}</p>
      )}

      <MDX components={components} />
    </article>
  );
}

export { Article };
