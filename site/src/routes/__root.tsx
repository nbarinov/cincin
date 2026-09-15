import '../styles/base.css';

import type { ReactNode } from 'react';
import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';

const title = 'cincin · framework-agnostic toast library';
const description =
  'Framework-agnostic toast library: an entry store, a presenter that shows it, thin adapters, polished UX.';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, viewport-fit=cover',
      },
      { title },
      { name: 'description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'cincin' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: 'https://cincin.nbarinov.io/' },
      { name: 'twitter:card', content: 'summary' },
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
            const theme = localStorage.getItem('cincin:theme');
            if (theme) {
              document.documentElement.style.colorScheme = theme;
              document.documentElement.dataset.theme = theme;
            }
          }
        `,
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
