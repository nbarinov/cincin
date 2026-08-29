import { createSwipeChannel } from './swipe-channel';
import { makeElement } from './test-helpers';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createSwipeChannel', () => {
  it('should leave touch-action alone, the adapters claim it', () => {
    // The channel binds lazily, at the first gesture: a touch-action
    // claim from here would arrive too late for the browser's
    // scroll-vs-app decision. The adapters claim it declaratively
    // through `touchActionFor` before any gesture instead.
    const element = makeElement();
    createSwipeChannel(element, 'right');
    expect(element.style.touchAction).toBe('');
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

    expect(createSwipeChannel(element, 'right').exitTarget()).toBeGreaterThan(
      0
    );
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

  it('should toggle the swiping marker', () => {
    const element = makeElement();
    const channel = createSwipeChannel(element, 'right');

    channel.markSwiping(true);
    expect(element.getAttribute('data-swiping')).toBe('true');

    channel.markSwiping(false);
    expect(element.hasAttribute('data-swiping')).toBe(false);
  });

  it('should enter the departure phase and report it', () => {
    const element = makeElement();
    const channel = createSwipeChannel(element, 'left');

    expect(channel.exiting()).toBe(false);

    channel.markExit();

    expect(channel.exiting()).toBe(true);
    expect(element.getAttribute('data-swipe-direction')).toBe('left');
  });

  it('should clear the swiping marker on release but keep the exit marker', () => {
    const element = makeElement();
    const channel = createSwipeChannel(element, 'right');

    channel.markSwiping(true);
    channel.markExit();
    channel.release();

    expect(element.hasAttribute('data-swiping')).toBe(false);
    expect(element.getAttribute('data-swipe-direction')).toBe('right');
  });
});
