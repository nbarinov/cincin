import * as React from 'react';
import type { ReactNode } from 'react';
import { notFound } from '@tanstack/react-router';
import { docs } from '@/content/docs';
import { loadPage } from '@/content/server';
import type { Locale } from '@/shared/i18n/config';

type Anchor = { url: string; title: string; depth: number };

async function loadArticle(slugs: string[], locale: Locale) {
  const data = await loadPage({ data: { slugs, locale } });
  const page = docs.getPage(data.path);

  if (page === undefined) {
    throw notFound();
  }

  const { toc } = await page.load();

  return {
    ...data,
    anchors: toc.filter((item) => item.depth === 2).map(toAnchor),
  };
}

export { loadArticle };
export type { Anchor };

// utils

function toAnchor(item: {
  url: string;
  title: ReactNode;
  depth: number;
}): Anchor {
  return { url: item.url, title: textOf(item.title), depth: item.depth };
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string') {
    return node;
  }

  if (typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(textOf).join('');
  }

  if (React.isValidElement<{ children?: ReactNode }>(node)) {
    return textOf(node.props.children);
  }

  return '';
}
