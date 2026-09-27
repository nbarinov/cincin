import { createFileRoute } from '@tanstack/react-router';
import { DocsPage } from '@/docs/page';
import { loadArticle } from '@/docs/load-article';
import { pageMeta } from '@/docs/page-meta';

export const Route = createFileRoute('/{-$locale}/docs/$framework/$')({
  loader: ({ params, context }) =>
    loadArticle((params._splat ?? '').split('/'), context.locale),
  head: ({ loaderData }) => pageMeta(loaderData),
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();

  return <DocsPage {...data} />;
}
