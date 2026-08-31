import {
  assignStyle,
  parseTranslate,
  touchActionFor,
  translateValue,
} from './utils';

describe('translateValue', () => {
  it('should format the offset along the requested axis', () => {
    expect(translateValue('x', 120)).toBe('120px 0px');
    expect(translateValue('y', -40)).toBe('0px -40px');
  });
});

describe('parseTranslate', () => {
  it('should read [0, 0] when translate is not set', () => {
    const element = document.createElement('div');
    document.body.append(element);

    expect(parseTranslate(element)).toEqual([0, 0]);
    element.remove();
  });

  it('should parse single and double value forms', () => {
    const element = document.createElement('div');
    document.body.append(element);

    element.style.translate = '10px';
    expect(parseTranslate(element)).toEqual([10, 0]);

    element.style.translate = '10px 20px';
    expect(parseTranslate(element)).toEqual([10, 20]);
    element.remove();
  });
});

describe('assignStyle', () => {
  it('should apply camelCase properties as real declarations', () => {
    const element = document.createElement('div');
    const restore = assignStyle(element, { touchAction: 'pan-y' });

    expect(element.style.touchAction).toBe('pan-y');
    // The regression this pins: setProperty with a camelCase key would
    // silently produce an empty declaration.
    expect(element.style.cssText).toContain('touch-action: pan-y');

    restore();
    expect(element.style.touchAction).toBe('');
  });

  it('should restore a pre-existing camelCase value', () => {
    const element = document.createElement('div');
    element.style.touchAction = 'none';

    const restore = assignStyle(element, { touchAction: 'pan-x' });
    expect(element.style.touchAction).toBe('pan-x');

    restore();
    expect(element.style.touchAction).toBe('none');
  });

  it('should apply and remove custom properties', () => {
    const element = document.createElement('div');
    const restore = assignStyle(element, { '--cincin-swipe-x': '0px' });

    expect(element.style.getPropertyValue('--cincin-swipe-x')).toBe('0px');

    restore();
    expect(element.style.getPropertyValue('--cincin-swipe-x')).toBe('');
  });

  it('should restore a pre-existing custom property value', () => {
    const element = document.createElement('div');
    element.style.setProperty('--cincin-swipe-x', '7px');

    const restore = assignStyle(element, { '--cincin-swipe-x': '0px' });
    expect(element.style.getPropertyValue('--cincin-swipe-x')).toBe('0px');

    restore();
    expect(element.style.getPropertyValue('--cincin-swipe-x')).toBe('7px');
  });
});

describe('touchActionFor', () => {
  it('should reserve the cross axis for the browser', () => {
    expect(touchActionFor(['right'])).toBe('pan-y');
    expect(touchActionFor(['left', 'right'])).toBe('pan-y');
    expect(touchActionFor(['up'])).toBe('pan-x');
    expect(touchActionFor(['up', 'down'])).toBe('pan-x');
  });

  it('should claim both axes for a mixed set', () => {
    expect(touchActionFor(['right', 'down'])).toBe('none');
    expect(touchActionFor(['left', 'up'])).toBe('none');
  });
});
