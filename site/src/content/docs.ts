import { defineDocs } from 'fumadocs-mdx/macro';

const docs = defineDocs({ dir: 'content/docs', docs: { async: true } });

// The loader hands the page over as its path; the entry behind it is
// looked up again on render, and a miss is a build gone out of step.
function getEntry(path: string) {
  const entry = docs.getPage(path);

  if (entry === undefined) {
    throw new Error(`Unknown page: ${path}`);
  }

  return entry;
}

export { docs, getEntry };
