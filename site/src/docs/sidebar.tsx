import * as React from 'react';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useTranslations } from 'use-intl';
import { VisuallyHidden } from '@/ui/visually-hidden';
import {
  DEFAULT_FRAMEWORK,
  FRAMEWORK_NAMES,
  FRAMEWORKS,
} from '@/content/frameworks';
import { START_PAGE } from '@/content/pages';
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
