import { defineDocs } from 'fumadocs-mdx/macro';

const docs = defineDocs({ dir: 'content/docs', docs: { async: true } });

export { docs };
