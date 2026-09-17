import '@/styles/base.css';

import * as React from 'react';
import type { ReactNode } from 'react';
import {
  createRootRoute,
  HeadContent,
  Scripts,
  useParams,
} from '@tanstack/react-router';
import { THEME_KEY, theme } from '@/shared/theme';
import { DEFAULT_LOCALE } from '@/shared/i18n/config';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, viewport-fit=cover',
      },
    ],
    links: [
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap',
      },
    ],
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
});

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const locale = useParams({
    strict: false,
    select: (params) => params.locale ?? DEFAULT_LOCALE,
  });
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
        {children}
        <Scripts />
      </body>
    </html>
  );
}
