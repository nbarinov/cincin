import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { DEFAULT_LOCALE, isLocale, LOCALES } from '@/shared/i18n/config';
import { siteHref, withoutLocale } from '@/shared/site';

export const Route = createFileRoute('/{-$locale}')({
  beforeLoad({ params, location }) {
    if (params.locale === DEFAULT_LOCALE) {
      throw redirect({ href: withoutLocale(location.pathname) });
    }

    if (params.locale !== undefined && !isLocale(params.locale)) {
      throw notFound();
    }
  },
  head({ matches }) {
    const pathname = matches.at(-1)?.pathname ?? '/';

    return {
      links: LOCALES.map((locale) => ({
        rel: 'alternate',
        hrefLang: locale,
        href: siteHref(pathname, locale),
      })),
    };
  },
});
