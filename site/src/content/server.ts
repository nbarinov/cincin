import { createServerFn } from '@tanstack/react-start';
import { notFound } from '@tanstack/react-router';
import { z } from 'zod';
import { LOCALES } from '@/shared/i18n/config';
import { buildNav } from './nav';
import { isTranslated, source } from './source';

const localeSchema = z.enum(LOCALES);
const pageInputSchema = z.object({
  slugs: z.array(z.string()),
  locale: localeSchema,
});

const loadNav = createServerFn({ method: 'GET' })
  .validator(localeSchema)
  .handler(({ data }) => buildNav(data));

const loadPage = createServerFn({ method: 'GET' })
  .validator(pageInputSchema)
  .handler(({ data: { slugs, locale } }) => {
    const page = source.getPage(slugs, locale);

    if (page === undefined) {
      throw notFound();
    }

    return {
      path: page.path,
      title: page.data.title,
      description: page.data.description,
      translated: isTranslated(page, locale),
    };
  });

export { loadNav, loadPage };
