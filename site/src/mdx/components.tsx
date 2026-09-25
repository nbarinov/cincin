import type { MDXComponents } from 'mdx/types';
import {
  Anchor,
  Code,
  H2,
  H3,
  OrderedList,
  Paragraph,
  UnorderedList,
} from './typography';

const components = {
  h2: H2,
  h3: H3,
  p: Paragraph,
  ul: UnorderedList,
  ol: OrderedList,
  a: Anchor,
  code: Code,
} satisfies MDXComponents;

export { components };
