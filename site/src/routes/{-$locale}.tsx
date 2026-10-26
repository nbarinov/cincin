import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  LOCALES,
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
} from '@/shared/i18n/config';
import { siteHref, withoutLocale } from '@/shared/site';

export const Route = createFileRoute('/{-$locale}')({
  params: {
    parse: ({ locale }): { locale?: Locale } | false =>
      locale === undefined || isLocale(locale) ? { locale } : false,
  },
  beforeLoad({ params, location }) {
    if (params.locale === DEFAULT_LOCALE) {
      throw redirect({ href: withoutLocale(location.pathname) });
    }
  },
  head({ match, matches }) {
    const pathname = matches.at(-1)?.pathname ?? '/';

    return {
      links: [
        { rel: 'canonical', href: siteHref(pathname, match.context.locale) },
        ...LOCALES.map((locale) => ({
          rel: 'alternate',
          hrefLang: locale,
          href: siteHref(pathname, locale),
        })),
        {
          rel: 'alternate',
          hrefLang: 'x-default',
          href: siteHref(pathname, DEFAULT_LOCALE),
        },
      ],
    };
  },
});
