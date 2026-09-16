import { createFileRoute } from '@tanstack/react-router';
import { createTranslator } from 'use-intl';
import { LandingPage } from '@/landing/page';
import { siteHref } from '@/shared/site';

export const Route = createFileRoute('/{-$locale}/')({
  head({ match }) {
    const { locale, messages } = match.context;

    const t = createTranslator({ locale, messages, namespace: 'landing.meta' });

    return {
      meta: [
        { title: t('title') },
        { name: 'description', content: t('description') },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'cincin' },
        { property: 'og:title', content: t('title') },
        { property: 'og:description', content: t('description') },
        { property: 'og:url', content: siteHref('/', locale) },
        { name: 'twitter:card', content: 'summary' },
      ],
    };
  },
  component: LandingPage,
});
