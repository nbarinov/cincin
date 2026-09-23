import { createFileRoute } from '@tanstack/react-router';
import { docs } from '@/content/docs';
import { loadPage } from '@/content/server';
import { Article } from '@/docs/article';
import { pageMeta } from '@/docs/page-meta';

export const Route = createFileRoute('/{-$locale}/docs/')({
  async loader({ context }) {
    const data = await loadPage({
      data: { slugs: [], locale: context.locale },
    });

    await docs.getPage(data.path)?.preload();

    return data;
  },
  head: ({ loaderData }) => pageMeta(loaderData),
  component: OverviewPage,
});

function OverviewPage() {
  const data = Route.useLoaderData();

  return <Article {...data} />;
}
