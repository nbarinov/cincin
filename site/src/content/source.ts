import { loader, type Page } from 'fumadocs-core/source';
import { defineI18n } from 'fumadocs-core/i18n';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/shared/i18n/config';
import { docs } from './docs';

const i18n = defineI18n({
  languages: [...LOCALES],
  defaultLanguage: DEFAULT_LOCALE,
  parser: 'dot',
});

const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: '/docs',
  i18n,
});

function isTranslated(page: Page, locale: Locale): boolean {
  return locale === DEFAULT_LOCALE || page.path.endsWith(`.${locale}.mdx`);
}

export { source, isTranslated };
