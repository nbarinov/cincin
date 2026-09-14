type ToasterOffsetValue = number | string;

type ToasterOffsetAxes = {
  x?: ToasterOffsetValue;
  y?: ToasterOffsetValue;
};

type ToasterOffset = ToasterOffsetValue | ToasterOffsetAxes;

const OFFSET_X = '--cincin-offset-x';
const OFFSET_Y = '--cincin-offset-y';

function offsetVars(offset: ToasterOffset | undefined): Record<string, string> {
  if (offset === undefined) {
    return {};
  }

  if (typeof offset !== 'object') {
    return { [OFFSET_Y]: lengthOf(offset) };
  }

  const vars: Record<string, string> = {};

  if (offset.x !== undefined) {
    vars[OFFSET_X] = lengthOf(offset.x);
  }

  if (offset.y !== undefined) {
    vars[OFFSET_Y] = lengthOf(offset.y);
  }

  return vars;
}

export { offsetVars };
export type { ToasterOffset, ToasterOffsetAxes, ToasterOffsetValue };

// utils

function lengthOf(value: ToasterOffsetValue): string {
  return typeof value === 'number' ? `${value}px` : value;
}
