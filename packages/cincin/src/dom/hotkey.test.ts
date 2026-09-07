import { attachHotkey, parseHotkey } from './hotkey';
import type { Hotkey } from './hotkey';

/** Dispatches a cancelable keydown on `target` and reports whether it
 * survived `preventDefault`. */
function press(
  init: KeyboardEventInit,
  target: GlobalEventHandlers & EventTarget = document
): { defaultPrevented: boolean } {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return { defaultPrevented: event.defaultPrevented };
}

const detachers: Array<() => void> = [];

function attach(
  hotkey: Hotkey,
  onPress: (event: KeyboardEvent) => void = () => {},
  target?: GlobalEventHandlers
): () => void {
  const detach = attachHotkey(hotkey, onPress, target ? { target } : {});
  detachers.push(detach);
  return detach;
}

afterEach(() => {
  while (detachers.length > 0) {
    detachers.pop()!();
  }
  vi.restoreAllMocks();
});

describe('parseHotkey', () => {
  it('should read every modifier subset in canonical order', () => {
    expect(parseHotkey('Alt+T')).toEqual({
      ctrlKey: false,
      altKey: true,
      shiftKey: false,
      metaKey: false,
      code: 'KeyT',
    });
    expect(parseHotkey('Control+Alt+Shift+Meta+Escape')).toEqual({
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
      metaKey: true,
      key: 'Escape',
    });
    expect(parseHotkey('Shift+Meta+F12')?.key).toBe('F12');
  });

  it('should map letters and digits to physical keys and Space to its key', () => {
    expect(parseHotkey('Control+1')?.code).toBe('Digit1');
    expect(parseHotkey('Meta+Z')?.code).toBe('KeyZ');
    expect(parseHotkey('Alt+Space')?.key).toBe(' ');
  });

  it('should reject a key without Control, Alt or Meta', () => {
    expect(parseHotkey('T')).toBeUndefined();
    expect(parseHotkey('Shift+T')).toBeUndefined();
  });

  it('should reject modifiers out of order or repeated', () => {
    expect(parseHotkey('Shift+Alt+T')).toBeUndefined();
    expect(parseHotkey('Alt+Alt+T')).toBeUndefined();
    expect(parseHotkey('Ctrl+T')).toBeUndefined();
  });

  it('should reject keys outside the set', () => {
    expect(parseHotkey('Alt+t')).toBeUndefined();
    expect(parseHotkey('Alt+/')).toBeUndefined();
    expect(parseHotkey('Alt+F13')).toBeUndefined();
    expect(parseHotkey('Alt+')).toBeUndefined();
    expect(parseHotkey('')).toBeUndefined();
  });
});

describe('attachHotkey', () => {
  it('should call onPress on a match and prevent the default', () => {
    const onPress = vi.fn();
    attach('Alt+T', onPress);

    const { defaultPrevented } = press({
      key: 't',
      code: 'KeyT',
      altKey: true,
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress.mock.calls[0]![0]).toBeInstanceOf(KeyboardEvent);
    expect(defaultPrevented).toBe(true);
  });

  it('should match a letter by its physical key under macOS Option', () => {
    const onPress = vi.fn();
    attach('Alt+T', onPress);

    press({ key: '†', code: 'KeyT', altKey: true });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should match named keys by event.key', () => {
    const onPress = vi.fn();
    attach('Control+Space', onPress);

    press({ key: ' ', code: 'Space', ctrlKey: true });
    press({ key: 'Enter', code: 'Enter', ctrlKey: true });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should require the exact modifier set', () => {
    const onPress = vi.fn();
    attach('Alt+T', onPress);

    const plain = press({ key: 't', code: 'KeyT' });
    const extra = press({
      key: 't',
      code: 'KeyT',
      altKey: true,
      shiftKey: true,
    });
    const other = press({ key: 't', code: 'KeyT', ctrlKey: true });

    expect(onPress).not.toHaveBeenCalled();
    expect(plain.defaultPrevented).toBe(false);
    expect(extra.defaultPrevented).toBe(false);
    expect(other.defaultPrevented).toBe(false);
  });

  it('should listen on the given target only', () => {
    const onPress = vi.fn();
    const island = document.createElement('div');
    document.body.append(island);
    attach('Alt+T', onPress, island);

    press({ key: 't', code: 'KeyT', altKey: true });
    expect(onPress).not.toHaveBeenCalled();

    press({ key: 't', code: 'KeyT', altKey: true }, island);
    expect(onPress).toHaveBeenCalledTimes(1);

    island.remove();
  });

  it('should stop listening after detach', () => {
    const onPress = vi.fn();
    const detach = attach('Alt+T', onPress);

    detach();
    press({ key: 't', code: 'KeyT', altKey: true });

    expect(onPress).not.toHaveBeenCalled();
  });

  it('should detach on an aborted signal', () => {
    const onPress = vi.fn();
    const controller = new AbortController();
    attachHotkey('Alt+T', onPress, { signal: controller.signal });

    controller.abort();
    press({ key: 't', code: 'KeyT', altKey: true });

    expect(onPress).not.toHaveBeenCalled();
  });

  it('should warn and attach nothing for an invalid hotkey', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onPress = vi.fn();
    attach('Shift+T' as Hotkey, onPress);

    const { defaultPrevented } = press({
      key: 'T',
      code: 'KeyT',
      shiftKey: true,
    });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('invalid hotkey "Shift+T"');
    expect(onPress).not.toHaveBeenCalled();
    expect(defaultPrevented).toBe(false);
  });
});
