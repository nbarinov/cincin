import * as React from 'react';
import { getRouteApi, Link, useMatch, useParams } from '@tanstack/react-router';
import { AnchorProvider, TOCItem, useActiveAnchor } from 'fumadocs-core/toc';
import { useTranslations } from 'use-intl';
import { VisuallyHidden } from '@/ui/visually-hidden';
import {
  DEFAULT_FRAMEWORK,
  FRAMEWORK_NAMES,
  FRAMEWORKS,
} from '@/content/frameworks';
import { START_PAGE } from '@/content/pages';
import type { Anchor } from './load-article';
import styles from './sidebar.module.css';

const layout = getRouteApi('/{-$locale}/docs');

function Sidebar() {
  const t = useTranslations('docs.sidebar');

  return (
    <nav className={styles.sidebar} aria-label={t('label')}>
      <Frameworks />
      <hr className={styles.rule} aria-hidden />
      <Pages />
    </nav>
  );
}

export { Sidebar };

// components

function Frameworks() {
  const t = useTranslations('docs.sidebar');
  const id = React.useId();

  return (
    <>
      <p id={id} className={styles.heading}>
        {t('framework')}
      </p>
      <ul className={styles.frameworks} aria-labelledby={id}>
        {FRAMEWORKS.map((framework) => (
          <li key={framework}>
            <Link
              to="/{-$locale}/docs/$framework/$"
              params={(prev) => ({
                locale: prev.locale,
                framework,
                _splat: prev._splat ?? START_PAGE,
              })}
              className={styles.item}
            >
              {FRAMEWORK_NAMES[framework]}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function Pages() {
  const t = useTranslations('docs.sidebar');
  const id = React.useId();
  const nav = layout.useLoaderData();
  const current = useParams({
    strict: false,
    select: (params) => params._splat ?? '',
  });

  return (
    <>
      <VisuallyHidden id={id}>{t('pages')}</VisuallyHidden>
      <ul className={styles.pages} aria-labelledby={id}>
        {nav.map((item) => {
          if (item.type === 'separator') {
            return (
              <li key={item.title} className={styles.heading}>
                {item.title}
              </li>
            );
          }

          const slug = item.slugs.join('/');

          return (
            <li key={slug}>
              <PageLink slug={slug}>{item.title}</PageLink>
              {slug === current && <Anchors />}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function PageLink({ slug, children }: { slug: string; children: string }) {
  if (slug === '') {
    return (
      <Link
        to="/{-$locale}/docs"
        params={(prev) => ({ locale: prev.locale })}
        activeOptions={{ exact: true }}
        className={styles.item}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      to="/{-$locale}/docs/$framework/$"
      params={(prev) => ({
        locale: prev.locale,
        framework: prev.framework ?? DEFAULT_FRAMEWORK,
        _splat: slug,
      })}
      className={styles.item}
    >
      {children}
    </Link>
  );
}

function Anchors() {
  const anchors = usePageAnchors();

  if (anchors.length === 0) {
    return null;
  }

  return (
    <AnchorProvider toc={anchors} single>
      <AnchorList anchors={anchors} />
    </AnchorProvider>
  );
}

function AnchorList({ anchors }: { anchors: Anchor[] }) {
  const active = useActiveAnchor();

  return (
    <ul className={styles.anchors}>
      {anchors.map((item) => (
        <li key={item.url}>
          <TOCItem
            href={item.url}
            className={styles.anchor}
            aria-current={item.url === `#${active}` ? 'location' : undefined}
          >
            {item.title}
          </TOCItem>
        </li>
      ))}
    </ul>
  );
}

// hooks

function usePageAnchors(): Anchor[] {
  const page = useMatch({
    from: '/{-$locale}/docs/$framework/$',
    shouldThrow: false,
    select: (match) => match.loaderData?.anchors,
  });
  const overview = useMatch({
    from: '/{-$locale}/docs/',
    shouldThrow: false,
    select: (match) => match.loaderData?.anchors,
  });

  return page ?? overview ?? [];
}
