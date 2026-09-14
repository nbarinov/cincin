const POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;

type FixturePosition = (typeof POSITIONS)[number];

/** The toaster's offset, in the shapes the prop takes. */
type FixtureOffset = number | { x?: number; y?: number };

type FixtureParams = {
  position: FixturePosition | undefined;
  duration: number | undefined;
  offset: FixtureOffset | undefined;
};

function initFixture(): FixtureParams {
  const params = new URLSearchParams(window.location.search);

  const dir = params.get('dir');
  if (dir !== null && dir !== 'ltr' && dir !== 'rtl') {
    throw new Error(`Unknown dir: "${dir}"`);
  }

  if (dir !== null) {
    document.documentElement.dir = dir;
  }

  return {
    position: parsePosition(params.get('position')),
    duration: parseDuration(params.get('duration')),
    offset: parseOffset(params.get('offset'), params.get('offsetX')),
  };
}

export { initFixture };
export type { FixtureOffset, FixtureParams, FixturePosition };

// utils

function parsePosition(value: string | null): FixturePosition | undefined {
  if (value === null) {
    return undefined;
  }

  const position = POSITIONS.find((candidate) => candidate === value);
  if (position === undefined) {
    throw new Error(`Unknown position: "${value}"`);
  }

  return position;
}

function parseDuration(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const duration = Number(value);
  if (Number.isNaN(duration)) {
    throw new Error(`Unknown duration: "${value}"`);
  }

  return duration;
}

/**
 * `offset` alone is the bare (vertical) shape, `offsetX` alone the
 * `{ x }` one, both together the pair: the three shapes the prop
 * takes, reachable from the url.
 */
function parseOffset(
  y: string | null,
  x: string | null
): FixtureOffset | undefined {
  const offsetY = parseDuration(y);
  const offsetX = parseDuration(x);

  if (offsetX === undefined) {
    return offsetY;
  }

  return offsetY === undefined ? { x: offsetX } : { x: offsetX, y: offsetY };
}
