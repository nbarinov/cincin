type Node = {
  type: string;
  name?: string;
  depth?: number;
  children?: Node[];
};

type File = { path?: string };

function remarkRules() {
  return (tree: Node, file: File) => {
    const where = file.path ?? 'an MDX file';

    walk(tree, (node, insideFramework) => {
      if (node.type === 'heading' && node.depth === 1) {
        throw new Error(
          `${where}: the page title comes from the frontmatter, no # in the body`
        );
      }

      if (node.type === 'heading' && insideFramework) {
        throw new Error(
          `${where}: a heading inside <Framework> would be a dead anchor elsewhere`
        );
      }

      if (isFramework(node) && isOverview(where)) {
        throw new Error(
          `${where}: the overview has no framework, <Framework> cannot render there`
        );
      }
    });
  };
}

export { remarkRules };

// utils

function walk(
  node: Node,
  visit: (node: Node, insideFramework: boolean) => void,
  insideFramework = false
) {
  visit(node, insideFramework);

  for (const child of node.children ?? []) {
    walk(child, visit, insideFramework || isFramework(node));
  }
}

function isFramework(node: Node): boolean {
  return node.type === 'mdxJsxFlowElement' && node.name === 'Framework';
}

function isOverview(path: string): boolean {
  return /(^|[\\/])index(\.[a-z]{2})?\.mdx$/.test(path);
}
