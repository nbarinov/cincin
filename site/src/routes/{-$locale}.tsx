import {
  createFileRoute,
  notFound,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { IntlProvider } from 'use-intl';
import {
  DEFAULT_LOCALE,
  isLocale,
  loadMessages,
  LOCALES,
  type Locale,
} from '@/shared/i18n/config';
import { siteHref, withoutLocale } from '@/shared/site';

export const Route = createFileRoute('/{-$locale}')({
  async beforeLoad({ params, location }) {
    if (params.locale === DEFAULT_LOCALE) {
      throw redirect({ href: withoutLocale(location.pathname) });
    }

    const locale = parseLocale(params.locale);
    const messages = await loadMessages(locale);

    return { locale, messages };
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
  component: LocaleLayout,
});

function LocaleLayout() {
  const { locale, messages } = Route.useRouteContext();

  return (
    <IntlProvider locale={locale} messages={messages} timeZone="UTC">
      <Outlet />
    </IntlProvider>
  );
}

// utils

function parseLocale(value: string | undefined): Locale {
  if (value === undefined) {
    return DEFAULT_LOCALE;
  }

  if (isLocale(value)) {
    return value;
  }

  throw notFound();
}
