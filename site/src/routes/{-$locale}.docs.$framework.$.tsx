import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { FRAMEWORK_NAMES } from '@/content/frameworks';
import { isPage, PAGES } from '@/content/pages';

export const Route = createFileRoute('/{-$locale}/docs/$framework/$')({
  beforeLoad({ params }) {
    const page = params._splat ?? '';

    if (!isPage(page)) {
      throw notFound();
    }

    return { page };
  },
  component: DocsPage,
});

function DocsPage() {
  const { framework } = Route.useParams();
  const { page } = Route.useRouteContext();

  return (
    <main>
      <h1>
        {FRAMEWORK_NAMES[framework]} / {page}
      </h1>
      <ul>
        {PAGES.map((item) => (
          <li key={item}>
            <Link
              to="/{-$locale}/docs/$framework/$"
              params={(prev) => ({ ...prev, framework, _splat: item })}
            >
              {item}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
