import type { AnyRouteMatch } from '@tanstack/react-router';

type PageMeta = { title: string; description?: string };

function pageMeta(page: PageMeta | undefined): {
  meta?: AnyRouteMatch['meta'];
} {
  if (page === undefined) {
    return {};
  }

  return {
    meta: [
      { title: `${page.title} – cincin` },
      ...(page.description === undefined
        ? []
        : [{ name: 'description', content: page.description }]),
    ],
  };
}

export { pageMeta };
