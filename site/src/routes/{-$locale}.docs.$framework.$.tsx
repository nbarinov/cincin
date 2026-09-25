import { createFileRoute } from '@tanstack/react-router';
import { Article } from '@/docs/article';
import { loadArticle } from '@/docs/load-article';
import { pageMeta } from '@/docs/page-meta';

export const Route = createFileRoute('/{-$locale}/docs/$framework/$')({
  loader: ({ params, context }) =>
    loadArticle((params._splat ?? '').split('/'), context.locale),
  head: ({ loaderData }) => pageMeta(loaderData),
  component: DocsPage,
});

function DocsPage() {
  const data = Route.useLoaderData();

  return <Article {...data} />;
}
