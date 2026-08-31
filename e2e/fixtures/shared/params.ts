const POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;

type FixturePosition = (typeof POSITIONS)[number];

type FixtureParams = {
  position: FixturePosition | undefined;
  duration: number | undefined;
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
  };
}

export { initFixture };
export type { FixtureParams, FixturePosition };

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
