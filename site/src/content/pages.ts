const PAGES = ['getting-started', 'api', 'recipes'] as const;
const START_PAGE: Page = 'getting-started';

type Page = (typeof PAGES)[number];

function isPage(value: string): value is Page {
  return PAGES.some((page) => page === value);
}

export { isPage, PAGES, START_PAGE };
export type { Page };
