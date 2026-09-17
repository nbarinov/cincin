import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
  });
}

export { getRouter };
