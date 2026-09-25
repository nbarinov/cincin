import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultStaleTime: Infinity,
    defaultPreload: 'intent',
  });
}

export { getRouter };
