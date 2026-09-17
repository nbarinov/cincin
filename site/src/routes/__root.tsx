import '@/styles/base.css';

import * as React from 'react';
import type { ReactNode } from 'react';
import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { THEME_KEY, theme } from '@/shared/theme';
import {
  DEFAULT_LOCALE,
  DEFAULT_MESSAGES,
  isLocale,
  loadMessages,
} from '@/shared/i18n/config';
import { NotFoundPage } from '@/not-found/page';
import { SiteHeader } from '@/ui/site-header';
import { IntlProvider } from 'use-intl';

export const Route = createRootRoute({
  async beforeLoad({ params }) {
    const prefix =
      'locale' in params && typeof params.locale === 'string'
        ? params.locale
        : '';
    const locale = isLocale(prefix) ? prefix : DEFAULT_LOCALE;
    const messages =
      locale === DEFAULT_LOCALE ? DEFAULT_MESSAGES : await loadMessages(locale);

    return { locale, messages };
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, viewport-fit=cover',
      },
      { title: 'cincin' },
    ],
    links: [{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    scripts: [
      {
        children: `
          {
            const theme = localStorage.getItem('${THEME_KEY}');
            if (theme) {
              document.documentElement.dataset.colorScheme = theme;
            }
          }
        `,
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
});

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const { locale, messages } = Route.useRouteContext();
  const scheme = React.useSyncExternalStore(
    theme.subscribe,
    theme.getSnapshot,
    theme.getPrepaintedSnapshot
  );

  return (
    <html lang={locale} data-color-scheme={scheme ?? undefined}>
      <head>
        <HeadContent />
        <meta
          name="theme-color"
          content="#f7f7f4"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#131316"
          media="(prefers-color-scheme: dark)"
        />
      </head>
      <body>
        <IntlProvider locale={locale} messages={messages} timeZone="UTC">
          <SiteHeader />
          {children}
        </IntlProvider>
        <Scripts />
      </body>
    </html>
  );
}
