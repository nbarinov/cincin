import { defineConfig } from 'fumadocs-mdx/config';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';
import { createCssVariablesTheme } from 'shiki';
import { remarkRules } from './src/content/remark-rules';

const theme = createCssVariablesTheme({
  name: 'cincin',
  variablePrefix: '--code-',
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: { panel: theme },
      defaultColor: 'panel',
      icon: false,
      parseMetaString(meta, node, tree) {
        return rehypeCodeDefaultOptions.parseMetaString?.(meta, node, tree);
      },
    },
    remarkCodeTabOptions: false,
    remarkPlugins: [remarkRules],
  },
});
