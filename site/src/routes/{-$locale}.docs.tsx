import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { createTranslator } from 'use-intl';
import { siteHref } from '@/shared/site';
import { DocsHeader } from '@/ui/docs-header';
import { loadNav } from '@/content/server';
import {
  DEFAULT_FRAMEWORK,
  FRAMEWORK_NAMES,
  FRAMEWORKS,
} from '@/content/frameworks';
import { START_PAGE } from '@/content/pages';

export const Route = createFileRoute('/{-$locale}/docs')({
  loader: ({ context }) => loadNav({ data: context.locale }),
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
  const nav = Route.useLoaderData();

  return (
    <>
      <DocsHeader />
      <ul>
        {FRAMEWORKS.map((item) => (
          <li key={item}>
            <Link
              to="/{-$locale}/docs/$framework/$"
              params={(prev) => ({
                locale: prev.locale,
                framework: item,
                _splat: prev._splat ?? START_PAGE,
              })}
            >
              {FRAMEWORK_NAMES[item]}
            </Link>
          </li>
        ))}
      </ul>
      <ul>
        {nav.map((item) => {
          if (item.type === 'separator') {
            return <li key={item.title}>{item.title}</li>;
          }

          return (
            <li key={item.slugs.join('/')}>
              {item.slugs.length === 0 ? (
                <Link
                  to="/{-$locale}/docs"
                  params={(prev) => ({ locale: prev.locale })}
                  activeOptions={{ exact: true }}
                >
                  {item.title}
                </Link>
              ) : (
                <Link
                  to="/{-$locale}/docs/$framework/$"
                  params={(prev) => ({
                    locale: prev.locale,
                    framework: prev.framework ?? DEFAULT_FRAMEWORK,
                    _splat: item.slugs.join('/'),
                  })}
                >
                  {item.title}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <hr />
      <Outlet />
    </>
  );
}
