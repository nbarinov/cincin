import { createFileRoute } from '@tanstack/react-router';
import { Article } from '@/docs/article';
import { loadArticle } from '@/docs/load-article';
import { pageMeta } from '@/docs/page-meta';

export const Route = createFileRoute('/{-$locale}/docs/')({
  loader: ({ context }) => loadArticle([], context.locale),
  head: ({ loaderData }) => pageMeta(loaderData),
  component: OverviewPage,
});

function OverviewPage() {
  const data = Route.useLoaderData();

  return <Article {...data} />;
}
