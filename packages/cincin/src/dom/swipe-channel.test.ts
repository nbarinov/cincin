import { createSwipeChannel } from './swipe-channel';

function makeElement(): HTMLElement {
  const parent = document.createElement('div');
  const element = document.createElement('div');
  parent.append(element);
  document.body.append(parent);
  return element;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createSwipeChannel', () => {
  it('should claim touch-action for the cross axis', () => {
    const horizontal = makeElement();
    createSwipeChannel(horizontal, 'right');
    expect(horizontal.style.touchAction).toBe('pan-y');

    const vertical = makeElement();
    createSwipeChannel(vertical, 'down');
    expect(vertical.style.touchAction).toBe('pan-x');
  });

  it('should claim the rest position and the protocol variable', () => {
    const element = makeElement();
    createSwipeChannel(element, 'right');

    expect(element.style.translate).toBe('0px 0px');
    expect(element.style.getPropertyValue('--cincin-swipe-x')).toBe('0px');
  });

  it('should write both channels on set', () => {
    const element = makeElement();
    const channel = createSwipeChannel(element, 'right');

    channel.set(120);

    expect(element.style.translate).toBe('120px 0px');
    expect(element.style.getPropertyValue('--cincin-swipe-x')).toBe('120px');
  });

  it('should use the vertical channel for vertical directions', () => {
    const element = makeElement();
    const channel = createSwipeChannel(element, 'down');

    channel.set(80);

    expect(element.style.translate).toBe('0px 80px');
    expect(element.style.getPropertyValue('--cincin-swipe-y')).toBe('80px');
  });

  it('should read the current offset back from the computed style', () => {
    const element = makeElement();
    const channel = createSwipeChannel(element, 'right');

    channel.set(64);

    expect(channel.read()).toBe(64);
  });

  it('should sign the exit target by the direction', () => {
    const element = makeElement();

    expect(createSwipeChannel(element, 'right').exitTarget()).toBeGreaterThan(0);
    expect(createSwipeChannel(element, 'left').exitTarget()).toBeLessThan(0);
    expect(createSwipeChannel(element, 'up').exitTarget()).toBeLessThan(0);
    expect(createSwipeChannel(element, 'down').exitTarget()).toBeGreaterThan(0);
  });

  it('should release every claimed channel back to its pre-attach state', () => {
    const element = makeElement();
    element.style.touchAction = 'none';

    const channel = createSwipeChannel(element, 'right');
    channel.set(120);
    channel.release();

    expect(element.style.touchAction).toBe('none');
    expect(element.style.translate).toBe('');
    expect(element.style.getPropertyValue('--cincin-swipe-x')).toBe('');
  });
});
