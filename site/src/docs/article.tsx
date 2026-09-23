import * as React from 'react';
import { docs } from '@/content/docs';
import { components } from '@/mdx/components';

type ArticleProps = { path: string; title: string; translated: boolean };

type Page = NonNullable<ReturnType<typeof docs.getPage>>;

function Article({ path, title, translated }: ArticleProps) {
  const page = docs.getPage(path);

  if (page === undefined) {
    throw new Error(`Unknown page: ${path}`);
  }

  return (
    <article lang={translated ? undefined : 'en'}>
      {!translated && <p>This page is not translated yet.</p>}

      <h1>{title}</h1>

      <React.Suspense>
        <Body page={page} />
      </React.Suspense>
    </article>
  );
}

function Body({ page }: { page: Page }) {
  const { toc } = React.use(page.load());
  const MDX = page.body;

  return (
    <>
      <ul>
        {toc.map((item) => (
          <li key={item.url}>
            <a href={item.url}>{item.title}</a>
          </li>
        ))}
      </ul>
      <MDX components={components} />
    </>
  );
}

export { Article };
