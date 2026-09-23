import { createFileRoute } from '@tanstack/react-router';
import { isFramework } from '@/content/frameworks';

export const Route = createFileRoute('/{-$locale}/docs/$framework')({
  params: {
    parse: ({ framework }) => (isFramework(framework) ? { framework } : false),
  },
});
