import { cleanup, fireEvent, renderHook } from '@testing-library/preact';
import type { Hotkey } from 'cincin/dom';
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
    const { unmount } = renderHook(() =>
      useHotkey({ hotkey: 'Alt+T', onPress })
    );

    press();
    expect(onPress).toHaveBeenCalledTimes(1);

    unmount();
    press();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should attach nothing for false', () => {
    const onPress = vi.fn();
    renderHook(() => useHotkey({ hotkey: false, onPress }));

    press();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('should call the latest handler without re-attaching', () => {
    const first = vi.fn();
    const second = vi.fn();
    const spy = vi.spyOn(document, 'addEventListener');
    const { rerender } = renderHook(
      ({ onPress }: { onPress: () => void }) =>
        useHotkey({ hotkey: 'Alt+T', onPress }),
      { initialProps: { onPress: first } }
    );
    const attached = spy.mock.calls.length;

    rerender({ onPress: second });
    press();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls.length).toBe(attached);
    spy.mockRestore();
  });

  it('should re-attach when the hotkey changes', () => {
    const onPress = vi.fn();
    const { rerender } = renderHook(
      ({ hotkey }: { hotkey: Hotkey }) => useHotkey({ hotkey, onPress }),
      { initialProps: { hotkey: 'Alt+T' as Hotkey } }
    );

    rerender({ hotkey: 'Control+K' });
    press();
    expect(onPress).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'k', code: 'KeyK', ctrlKey: true });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
