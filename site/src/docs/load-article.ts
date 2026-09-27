import * as React from 'react';
import type { ReactNode } from 'react';
import { notFound } from '@tanstack/react-router';
import { getEntry } from '@/content/docs';
import { isTranslated, source } from '@/content/source';
import type { Locale } from '@/shared/i18n/config';

type Anchor = { url: string; title: string; depth: number };

async function loadArticle(slugs: string[], locale: Locale) {
  const page = source.getPage(slugs, locale);

  if (page === undefined) {
    throw notFound();
  }

  const { toc } = await getEntry(page.path).load();

  return {
    path: page.path,
    title: page.data.title,
    description: page.data.description,
    translated: isTranslated(page, locale),
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
