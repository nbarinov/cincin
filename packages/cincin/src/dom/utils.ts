import type { Axis } from './types';

function prefersReducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function translateValue(axis: Axis, px: number): string {
  return axis === 'x' ? `${px}px 0px` : `0px ${px}px`;
}

function parseTranslate(element: HTMLElement): [x: number, y: number] {
  const value = getComputedStyle(element).translate;

  if (!value || value === 'none') {
    return [0, 0];
  }

  const [x = '0', y = '0'] = value.split(' ');

  return [Number.parseFloat(x) || 0, Number.parseFloat(y) || 0];
}

type StyleProperties = Partial<CSSStyleDeclaration> & {
  [customProperty: `--${string}`]: string;
};

function assignStyle(
  element: HTMLElement | SVGElement,
  style: StyleProperties
): () => void {
  // Two write paths: custom properties only work through setProperty,
  // while camelCase keys only work through indexed assignment
  // (setProperty silently ignores them, it expects kebab-case names).
  const declaration = element.style as unknown as Record<string, string>;
  const previousValues: Array<[property: string, value: string]> = [];

  for (const [property, value] of Object.entries(style)) {
    if (typeof value !== 'string' && typeof value !== 'number') {
      continue;
    }

    if (property.startsWith('--')) {
      previousValues.push([property, element.style.getPropertyValue(property)]);
      element.style.setProperty(property, String(value));
    } else {
      previousValues.push([property, declaration[property] ?? '']);
      declaration[property] = String(value);
    }
  }

  return () => {
    for (const [property, value] of previousValues) {
      // An empty string resets the declaration entirely on both paths.
      if (property.startsWith('--')) {
        value.length === 0
          ? element.style.removeProperty(property)
          : element.style.setProperty(property, value);
      } else {
        declaration[property] = value;
      }
    }
  };
}

export { prefersReducedMotion, assignStyle, translateValue, parseTranslate };
