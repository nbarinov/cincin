import { createFileRoute, redirect } from '@tanstack/react-router';
import { START_PAGE } from '@/content/pages';

export const Route = createFileRoute('/{-$locale}/docs/$framework/')({
  beforeLoad({ params }) {
    throw redirect({
      to: '/{-$locale}/docs/$framework/$',
      params: { ...params, _splat: START_PAGE },
    });
  },
});
