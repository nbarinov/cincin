import { cleanup, fireEvent, render } from '@solidjs/testing-library';
import type { Hotkey } from 'cincin/dom';
import { createSignal } from 'solid-js';
import { useHotkey } from './use-hotkey';

function press(): void {
  fireEvent.keyDown(document, { key: 't', code: 'KeyT', altKey: true });
}

afterEach(() => {
  cleanup();
});

describe('useHotkey', () => {
  it('should listen while mounted and stop on unmount', () => {
    const onPress = vi.fn();
    const Host = () => {
      useHotkey({ hotkey: 'Alt+T', onPress });
      return null;
    };
    const { unmount } = render(() => <Host />);

    press();
    expect(onPress).toHaveBeenCalledTimes(1);

    unmount();
    press();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should attach nothing for false', () => {
    const onPress = vi.fn();
    const Host = () => {
      useHotkey({ hotkey: false, onPress });
      return null;
    };
    render(() => <Host />);

    press();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('should follow the hotkey accessor', () => {
    const onPress = vi.fn();
    const [hotkey, setHotkey] = createSignal<Hotkey>('Alt+T');
    const Host = () => {
      useHotkey(() => ({ hotkey: hotkey(), onPress }));
      return null;
    };
    render(() => <Host />);

    setHotkey('Control+K');
    press();
    expect(onPress).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'k', code: 'KeyK', ctrlKey: true });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
