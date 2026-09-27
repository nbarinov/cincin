import { createFileRoute } from '@tanstack/react-router';
import { Article } from '@/docs/article';
import { DocsPage } from '@/docs/page';
import { Toc } from '@/docs/toc';
import { loadArticle } from '@/docs/load-article';
import { pageMeta } from '@/docs/page-meta';

export const Route = createFileRoute('/{-$locale}/docs/')({
  loader: ({ context }) => loadArticle([], context.locale),
  head: ({ loaderData }) => pageMeta(loaderData),
  component: OverviewPage,
});

function OverviewPage() {
  const { anchors, ...article } = Route.useLoaderData();

  return (
    <DocsPage aside={anchors.length > 0 && <Toc anchors={anchors} />}>
      <Article {...article} />
    </DocsPage>
  );
}
