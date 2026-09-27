import { createFileRoute, Outlet } from '@tanstack/react-router';
import { createTranslator } from 'use-intl';
import { siteHref } from '@/shared/site';
import { buildNav } from '@/content/nav';
import { DocsLayout } from '@/docs/layout';
import { DocsHeader } from '@/docs/header';
import { Sidebar } from '@/docs/sidebar';

export const Route = createFileRoute('/{-$locale}/docs')({
  loader: ({ context }) => buildNav(context.locale),
  head({ match, matches }) {
    const { locale, messages } = match.context;
    const pathname = matches.at(-1)?.pathname ?? match.pathname;

    const t = createTranslator({ locale, messages, namespace: 'docs.meta' });

    return {
      meta: [
        { title: t('title') },
        { name: 'description', content: t('description') },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'cincin' },
        { property: 'og:title', content: t('title') },
        { property: 'og:description', content: t('description') },
        { property: 'og:url', content: siteHref(pathname, locale) },
        { name: 'twitter:card', content: 'summary' },
      ],
    };
  },
  component: Layout,
});

function Layout() {
  return (
    <DocsLayout header={<DocsHeader />} aside={<Sidebar />}>
      <Outlet />
    </DocsLayout>
  );
}
