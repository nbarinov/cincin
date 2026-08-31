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
    createSwipeChannel(element, ['right']);
    expect(element.style.touchAction).toBe('');
  });

  it('should claim the rest position and the allowed-axis variable', () => {
    const element = makeElement();
    createSwipeChannel(element, ['right']);

    expect(element.style.translate).toBe('0px 0px');
    expect(element.style.getPropertyValue('--cincin-swipe-x')).toBe('0px');
    // The cross axis is not ours: its variable stays unclaimed.
    expect(element.style.getPropertyValue('--cincin-swipe-y')).toBe('');
  });

  it('should claim both variables for a mixed set', () => {
    const element = makeElement();
    createSwipeChannel(element, ['right', 'down']);

    expect(element.style.getPropertyValue('--cincin-swipe-x')).toBe('0px');
    expect(element.style.getPropertyValue('--cincin-swipe-y')).toBe('0px');
  });

  it('should write the motion channel and the variables on set', () => {
    const element = makeElement();
    const channel = createSwipeChannel(element, ['right', 'down']);

    channel.set('x', 120);

    expect(element.style.translate).toBe('120px 0px');
    expect(element.style.getPropertyValue('--cincin-swipe-x')).toBe('120px');
    expect(element.style.getPropertyValue('--cincin-swipe-y')).toBe('0px');
  });

  it('should use the vertical channel for the vertical axis', () => {
    const element = makeElement();
    const channel = createSwipeChannel(element, ['down']);

    channel.set('y', 80);

    expect(element.style.translate).toBe('0px 80px');
    expect(element.style.getPropertyValue('--cincin-swipe-y')).toBe('80px');
  });

  it('should forfeit the other component on a cross-axis set', () => {
    // A single axis moves at a time: whatever the previous axis still
    // held (a caught spring's remainder) is dropped, not carried.
    const element = makeElement();
    const channel = createSwipeChannel(element, ['right', 'down']);

    channel.set('x', 120);
    channel.set('y', 80);

    expect(element.style.translate).toBe('0px 80px');
    expect(element.style.getPropertyValue('--cincin-swipe-x')).toBe('0px');
    expect(element.style.getPropertyValue('--cincin-swipe-y')).toBe('80px');
  });

  it('should pin the current visual offset and report both components', () => {
    const element = makeElement();
    const channel = createSwipeChannel(element, ['right']);

    // In jsdom the computed style mirrors the inline one, so a written
    // translate stands in for a mid-animation computed value.
    element.style.translate = '12px 0px';

    expect(channel.pin()).toEqual([12, 0]);
    expect(element.style.translate).toBe('12px 0px');
    expect(element.style.getPropertyValue('--cincin-swipe-x')).toBe('12px');
  });

  it('should sign the exit target by the requested axis and sign', () => {
    const element = makeElement();
    const channel = createSwipeChannel(element, ['right', 'down']);

    expect(channel.exitTarget('x', 1)).toBeGreaterThan(0);
    expect(channel.exitTarget('x', -1)).toBeLessThan(0);
    expect(channel.exitTarget('y', -1)).toBeLessThan(0);
    expect(channel.exitTarget('y', 1)).toBeGreaterThan(0);
  });

  it('should release every claimed channel back to its pre-attach state', () => {
    const element = makeElement();
    element.style.touchAction = 'none';

    const channel = createSwipeChannel(element, ['right', 'down']);
    channel.set('x', 120);
    channel.release();

    expect(element.style.touchAction).toBe('none');
    expect(element.style.translate).toBe('');
    expect(element.style.getPropertyValue('--cincin-swipe-x')).toBe('');
    expect(element.style.getPropertyValue('--cincin-swipe-y')).toBe('');
  });

  it('should toggle the swiping marker', () => {
    const element = makeElement();
    const channel = createSwipeChannel(element, ['right']);

    channel.markSwiping(true);
    expect(element.getAttribute('data-swiping')).toBe('true');

    channel.markSwiping(false);
    expect(element.hasAttribute('data-swiping')).toBe(false);
  });

  it('should enter the departure phase with the actual travel', () => {
    const element = makeElement();
    const channel = createSwipeChannel(element, ['left', 'right']);

    expect(channel.exiting()).toBe(false);

    channel.markExit('left');

    expect(channel.exiting()).toBe(true);
    expect(element.getAttribute('data-swipe-direction')).toBe('left');
  });

  it('should clear the swiping marker on release but keep the exit marker', () => {
    const element = makeElement();
    const channel = createSwipeChannel(element, ['right']);

    channel.markSwiping(true);
    channel.markExit('right');
    channel.release();

    expect(element.hasAttribute('data-swiping')).toBe(false);
    expect(element.getAttribute('data-swipe-direction')).toBe('right');
  });
});
