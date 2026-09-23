import { createFileRoute, Link } from '@tanstack/react-router';
import { FRAMEWORK_NAMES, FRAMEWORKS } from '@/content/frameworks';
import { START_PAGE } from '@/content/pages';

export const Route = createFileRoute('/{-$locale}/docs/')({
  component: OverviewPage,
});

function OverviewPage() {
  return (
    <main>
      <h1>Overview</h1>
      <ul>
        {FRAMEWORKS.map((framework) => (
          <li key={framework}>
            <Link
              to="/{-$locale}/docs/$framework/$"
              params={(prev) => ({
                ...prev,
                framework,
                _splat: START_PAGE,
              })}
            >
              {FRAMEWORK_NAMES[framework]}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
