import {
  axisSigns,
  dampen,
  directionFor,
  flingDuration,
  trailingVelocity,
} from './gesture';

describe('axisSigns', () => {
  it('should group the allowed signs by axis', () => {
    expect(axisSigns(['right', 'down'])).toEqual({
      x: new Set([1]),
      y: new Set([1]),
    });
    expect(axisSigns(['left', 'right'])).toEqual({ x: new Set([1, -1]) });
  });

  it('should leave a foreign axis absent', () => {
    expect(axisSigns(['right'])).not.toHaveProperty('y');
    expect(axisSigns([])).toEqual({});
  });
});

describe('directionFor', () => {
  it('should name the travel from the axis and the sign', () => {
    expect(directionFor('x', 1)).toBe('right');
    expect(directionFor('x', -1)).toBe('left');
    expect(directionFor('y', 1)).toBe('down');
    expect(directionFor('y', -1)).toBe('up');
  });
});

describe('dampen', () => {
  it('should pass movement along the allowed direction through', () => {
    expect(dampen(30, 1, 0.7)).toBe(30);
    expect(dampen(-30, -1, 0.7)).toBe(-30);
  });

  it('should compress movement against the direction with the power curve', () => {
    expect(dampen(-30, 1, 0.7)).toBeCloseTo(-Math.pow(30, 0.7), 5);
    expect(Math.abs(dampen(-30, 1, 0.7))).toBeLessThan(30);
  });

  it('should mirror the compression for negative directions', () => {
    expect(dampen(30, -1, 0.7)).toBeCloseTo(-dampen(-30, 1, 0.7), 5);
  });

  it('should grow the resistance with distance', () => {
    const nearRatio = Math.abs(dampen(-10, 1, 0.7)) / 10;
    const farRatio = Math.abs(dampen(-100, 1, 0.7)) / 100;

    expect(farRatio).toBeLessThan(nearRatio);
  });
});

describe('trailingVelocity', () => {
  it('should report 0 for fewer than two samples', () => {
    expect(trailingVelocity([], 80)).toBe(0);
    expect(trailingVelocity([{ t: 0, pos: 10 }], 80)).toBe(0);
  });

  it('should report 0 for a zero time delta', () => {
    const samples = [
      { t: 100, pos: 0 },
      { t: 100, pos: 50 },
    ];

    expect(trailingVelocity(samples, 80)).toBe(0);
  });

  it('should measure distance over time inside the window', () => {
    const samples = [
      { t: 0, pos: 0 },
      { t: 50, pos: 25 },
      { t: 100, pos: 50 },
    ];

    expect(trailingVelocity(samples, 200)).toBeCloseTo(0.5, 5);
  });

  it('should ignore samples older than the window', () => {
    const samples = [
      { t: 0, pos: 0 },
      { t: 500, pos: 500 },
      { t: 580, pos: 580 },
    ];

    // Only the tail from t >= 500 counts: 80px over 80ms.
    expect(trailingVelocity(samples, 80)).toBeCloseTo(1, 5);
  });

  it('should read near zero for a pull that stopped before release', () => {
    const samples = [
      { t: 0, pos: 0 },
      { t: 100, pos: 120 },
      { t: 200, pos: 120 },
      { t: 300, pos: 120 },
    ];

    expect(trailingVelocity(samples, 80)).toBe(0);
  });
});

describe('flingDuration', () => {
  it('should match the duration to the hand speed inside the clamps', () => {
    // slope * remaining / velocity = 3 * 300 / 3 = 300
    expect(flingDuration(300, 3, 3, 150, 450)).toBe(300);
  });

  it('should clamp a violent flick to the minimum', () => {
    expect(flingDuration(300, 20, 3, 150, 450)).toBe(150);
  });

  it('should clamp a threshold crawl to the maximum', () => {
    expect(flingDuration(300, 0.11, 3, 150, 450)).toBe(450);
  });

  it('should survive zero velocity via the guard', () => {
    expect(flingDuration(300, 0, 3, 150, 450)).toBe(450);
  });
});
