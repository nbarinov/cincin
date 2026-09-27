import type { MDXComponents } from 'mdx/types';
import { CodePanel } from './code-panel';
import { Framework } from './framework';
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
  pre: CodePanel,
  Framework,
} satisfies MDXComponents;

export { components };
