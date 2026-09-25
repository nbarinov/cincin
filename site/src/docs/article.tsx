import { docs } from '@/content/docs';
import { components } from '@/mdx/components';
import styles from './article.module.css';

type ArticleProps = { path: string; title: string; translated: boolean };

function Article({ path, title, translated }: ArticleProps) {
  const page = docs.getPage(path);

  if (page === undefined) {
    throw new Error(`Unknown page: ${path}`);
  }

  const MDX = page.body;

  return (
    <article className={styles.article} lang={translated ? undefined : 'en'}>
      {!translated && <p>This page is not translated yet.</p>}

      <h1>{title}</h1>

      <MDX components={components} />
    </article>
  );
}

export { Article };
