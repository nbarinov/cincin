import type { ReactNode } from 'react';
import type { Locale } from '@/shared/i18n/config';
import { source } from './source';

type NavItem =
  | { type: 'page'; title: string; slugs: string[] }
  | { type: 'separator'; title: string };

function buildNav(locale: Locale): NavItem[] {
  const items: NavItem[] = [];

  for (const node of source.getPageTree(locale).children) {
    if (node.type === 'separator') {
      items.push({ type: 'separator', title: textOf(node.name) });
    } else if (node.type === 'page') {
      const page = source.getNodePage(node, locale);

      if (page !== undefined) {
        items.push({ type: 'page', title: page.data.title, slugs: page.slugs });
      }
    }
  }

  return items;
}

export { buildNav };
export type { NavItem };

// utils

function textOf(name: ReactNode): string {
  return typeof name === 'string' ? name : '';
}
