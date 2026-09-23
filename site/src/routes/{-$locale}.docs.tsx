import { createFileRoute, Outlet } from '@tanstack/react-router';
import { createTranslator } from 'use-intl';
import { siteHref } from '@/shared/site';
import { DocsHeader } from '@/ui/docs-header';

export const Route = createFileRoute('/{-$locale}/docs')({
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
  component: DocsLayout,
});

function DocsLayout() {
  return (
    <>
      <DocsHeader />
      <Outlet />
    </>
  );
}
