import { DEFAULT_LOCALE, LOCALES, type Locale } from './i18n/config';

const SITE_URL = 'https://cincin.nbarinov.io';
const REPO_URL = 'https://github.com/nbarinov/cincin';
const EXAMPLES_URL = `${REPO_URL}/tree/main/examples`;

function siteHref(pathname: string, locale: Locale): string {
  const bare = withoutLocale(pathname);

  if (locale === DEFAULT_LOCALE) {
    return `${SITE_URL}${bare}`;
  }

  return `${SITE_URL}/${locale}${bare === '/' ? '' : bare}`;
}

function withoutLocale(pathname: string): string {
  const [, first = '', ...rest] = pathname.split('/');
  const segments = LOCALES.some((locale) => locale === first)
    ? rest
    : [first, ...rest];
  const bare = `/${segments.join('/')}`.replace(/\/+$/, '');

  return bare === '' ? '/' : bare;
}

export { SITE_URL, REPO_URL, EXAMPLES_URL, siteHref, withoutLocale };
